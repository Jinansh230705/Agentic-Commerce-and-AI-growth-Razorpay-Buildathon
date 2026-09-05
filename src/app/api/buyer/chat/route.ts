import { NextRequest, NextResponse } from 'next/server'
import { searchMerchants, getMerchantProfile, searchProducts, createCheckout, logAuditEvent, updateCheckout, negotiateDiscount } from '../../../../lib/buyer/tools'
export async function POST(req: NextRequest) {
  const body = await req.json()
  const { messages: incomingMessages, agentId } = body
  const sessionAgentId = agentId || `agent_${Math.random().toString(36).substring(2, 10)}`
  const baseUrl = req.headers.get('host') || 'localhost:3000'

  if (!process.env.AI_API_KEY && !process.env.GEMINI_API_KEY) {
    return NextResponse.json({
      agentId: sessionAgentId,
      status: 'FAILED',
      reason: 'AI_API_KEY or GEMINI_API_KEY is not configured in the environment.'
    }, { status: 500 })
  }

  try {
    const aiApiKey = process.env.AI_API_KEY || process.env.GEMINI_API_KEY || ''
    const isGemini = !process.env.AI_API_KEY && !!process.env.GEMINI_API_KEY
    const aiBaseUrl = process.env.AI_BASE_URL || (isGemini ? 'https://generativelanguage.googleapis.com/v1beta/openai/' : 'https://api.openai.com/v1')
    const aiModel = process.env.AI_MODEL || (isGemini ? 'gemma-4-26b-a4b-it' : 'gpt-4o')

    const systemInstruction = `You are an AI Buyer Agent. Your job is to fulfill the user's shopping request proactively and securely using tools.
You MUST act as an actual shopping agent, not just a search box. 

Follow these rules:
1. Under constraints: if the user asks for "shoes", ask for missing details like budget and size. Remember them in the conversation.
2. Evaluate products: when you use searchProducts, evaluate the returned products. If multiple match, pick the best one and explain WHY (e.g. "I found 3 matches. The Acme Running Shoe from Merchant A is the best fit because it is ₹3,499, available in size 9"). Do NOT invent products, prices, or reviews. Only use real data from the search.
3. Negotiate: If the user asks for a discount or cheaper price, use the negotiateDiscount tool. Do not invent a discount. If the tool fails or says it exceeds the max allowed, gracefully explain that you cannot apply further discounts.
4. Checkout: Once the user is satisfied and wants to buy, use createCheckout to prepare the order, then updateCheckout with shipping country.
5. FAST CHECKOUT: If the user has already selected a product and says "checkout" or "yes", DO NOT search for merchants or products again. Call createCheckout immediately.

Tool execution sequence for buying:
1. searchMerchants to find the merchant domain.
2. searchProducts on the domain.
3. (Optional) negotiateDiscount if the user asks for a discount after a checkout is created. Wait, you must createCheckout BEFORE you can negotiate.
So: createCheckout FIRST -> then negotiateDiscount.
4. updateCheckout for shipping if requested.

If you don't have enough information to search or checkout, ask the user. DO NOT use tools until you understand what they want.

You must NOT make up product IDs or prices. Use ONLY what the tools return.`;

    const tools: any = [
      {
        name: 'searchMerchants',
        description: 'Search the AI Commerce Discovery Registry',
        parameters: {
          type: 'object',
          properties: { query: { type: 'string' } },
          required: ['query']
        }
      },
      {
        name: 'getMerchantProfile',
        description: 'Get UCP profile to verify checkout capability',
        parameters: {
          type: 'object',
          properties: { domain: { type: 'string' } },
          required: ['domain']
        }
      },
      {
        name: 'searchProducts',
        description: 'Search products on merchant domain',
        parameters: {
          type: 'object',
          properties: { domain: { type: 'string' }, query: { type: 'string' } },
          required: ['domain', 'query']
        }
      },
      {
        name: 'createCheckout',
        description: 'Create a new UCP checkout session',
        parameters: {
          type: 'object',
          properties: {
            domain: { type: 'string' },
            merchantId: { type: 'string' },
            productId: { type: 'string' },
            quantity: { type: 'number' }
          },
          required: ['domain', 'merchantId', 'productId', 'quantity']
        }
      },
      {
        name: 'updateCheckout',
        description: 'Update checkout shipping information',
        parameters: {
          type: 'object',
          properties: {
            domain: { type: 'string' },
            checkoutId: { type: 'string' },
            country: { type: 'string' }
          },
          required: ['domain', 'checkoutId', 'country']
        }
      },
      {
        name: 'negotiateDiscount',
        description: 'Request a discount on an existing checkout session on behalf of the user. The merchant will approve or reject based on their policies.',
        parameters: {
          type: 'object',
          properties: {
            domain: { type: 'string' },
            checkoutId: { type: 'string' },
            requestedDiscountPercent: { type: 'number' }
          },
          required: ['domain', 'checkoutId', 'requestedDiscountPercent']
        }
      }
    ]

    // Convert to OpenAI tools format
    const openaiTools = tools.map((t: any) => ({
      type: 'function',
      function: {
        name: t.name,
        description: t.description,
        parameters: t.parameters
      }
    }))

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const sendEvent = (data: any) => {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        };

        try {
          let messages: any[] = [
            ...incomingMessages
          ];

          let currentCheckout: any = null;
          let currentProduct: any = null;
          let isComplete = false;
          let replyContent = "";

          sendEvent({ type: 'log', message: 'Agent initialized. Starting reasoning loop...', status: 'UNDERSTANDING' });

          for (let i = 0; i < 15; i++) {
            if (isComplete) break;

            const reqBody = {
              model: aiModel,
              messages: [
                { role: 'system', content: systemInstruction },
                ...messages.map((m: any) => {
                  const out: any = { role: m.role };
                  if (m.content) out.content = m.content;
                  if (m.tool_calls) out.tool_calls = m.tool_calls;
                  if (m.tool_call_id) out.tool_call_id = m.tool_call_id;
                  if (m.name) out.name = m.name;
                  return out;
                })
              ],
              tools: openaiTools
            };

            const rawResponse = await fetch(`${aiBaseUrl.replace(/\/$/, '')}/chat/completions`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${aiApiKey}`
              },
              body: JSON.stringify(reqBody)
            });

            if (!rawResponse.ok) {
              const errorText = await rawResponse.text();
              throw new Error(`API Error: ${rawResponse.status} - ${errorText}`);
            }

            const response = await rawResponse.json();
            const choice = response.choices[0].message;

            const message: any = {
              ...choice,
              role: 'assistant',
              content: choice.content || null
            };

            messages.push(message);

            if (message.tool_calls && message.tool_calls.length > 0) {
              for (const call of message.tool_calls) {
                const name = (call as any).function.name;
                const args = JSON.parse((call as any).function.arguments);

                let actionStatus = 'SEARCHING'
                if (name === 'negotiateDiscount') actionStatus = 'NEGOTIATING'
                if (name === 'createCheckout' || name === 'updateCheckout') actionStatus = 'CHECKOUT'

                sendEvent({ type: 'log', message: `Executing tool: ${name}(${JSON.stringify(args)})`, status: actionStatus });

                let resultData: any;
                try {
                  if (name === 'searchMerchants') {
                    await logAuditEvent(sessionAgentId, 'DISCOVERY_SEARCH', { query: args.query });
                    resultData = await searchMerchants(args.query);
                    if (resultData.length === 0) {
                      await logAuditEvent(sessionAgentId, 'DISCOVERY_FAILED', { reason: 'No merchants found' });
                    }
                  } else if (name === 'getMerchantProfile') {
                    await logAuditEvent(sessionAgentId, 'UCP_PROFILE_FETCH', { domain: args.domain });
                    resultData = await getMerchantProfile(args.domain);
                  } else if (name === 'searchProducts') {
                    await logAuditEvent(sessionAgentId, 'PRODUCT_SEARCH', { domain: args.domain, query: args.query });
                    resultData = await searchProducts(args.domain, args.query);
                  } else if (name === 'createCheckout') {
                    await logAuditEvent(sessionAgentId, 'CHECKOUT_CREATE', args);
                    resultData = await createCheckout(args.domain, args.merchantId, [{ productId: args.productId, quantity: args.quantity }]);
                    if (!resultData.error) {
                      currentCheckout = resultData;
                    }
                  } else if (name === 'updateCheckout') {
                    await logAuditEvent(sessionAgentId, 'CHECKOUT_UPDATE', args);
                    resultData = await updateCheckout(args.domain, args.checkoutId, { shippingAddress: { country: args.country } });
                    if (!resultData.error) {
                      currentCheckout = resultData;
                    }
                  } else if (name === 'negotiateDiscount') {
                    await logAuditEvent(sessionAgentId, 'NEGOTIATION_REQUEST', args);
                    resultData = await negotiateDiscount(args.domain, args.checkoutId, args.requestedDiscountPercent);
                    if (!resultData.error) {
                      currentCheckout = resultData;
                    }
                  } else {
                    resultData = { error: 'Unknown tool' };
                  }
                } catch (e: any) {
                  resultData = { error: e.message };
                }

                if (name === 'searchProducts' && Array.isArray(resultData)) {
                  // Capture best product if present
                  const maybeProd = resultData.find((p: any) => p.productId === currentCheckout?.lineItems?.[0]?.productId) || resultData[0];
                  if (maybeProd && !currentProduct) currentProduct = maybeProd;
                }

                messages.push({
                  role: 'tool',
                  tool_call_id: call.id,
                  name: name,
                  content: JSON.stringify(resultData)
                });

                sendEvent({ type: 'log', message: `Tool ${name} completed.`, status: actionStatus });
              }
            } else {
              if (message.content) {
                replyContent = message.content;
                // Don't send it as a log, send it as part of the done event
              }
              isComplete = true;
            }
          }

          // If the agent created a checkout and asks for authorization
          if (currentCheckout && !currentCheckout.error && (replyContent.toLowerCase().includes('authorize') || replyContent.toLowerCase().includes('checkout') || replyContent.toLowerCase().includes('buy'))) {
            sendEvent({ type: 'log', message: 'Ready for authorization', status: 'AUTHORIZATION' });

            if (!currentProduct && currentCheckout.lineItems?.length > 0) {
              const pRes = await searchProducts(baseUrl, '');
              currentProduct = pRes.find((p: any) => p.productId === currentCheckout.lineItems[0].productId);
            }

            await logAuditEvent(sessionAgentId, 'CONFIRMATION_REQUESTED', { checkoutId: currentCheckout.checkoutId });

            sendEvent({
              type: 'done',
              payload: {
                agentId: sessionAgentId,
                status: 'WAITING_FOR_CONFIRMATION',
                reply: replyContent,
                checkout: currentCheckout,
                product: currentProduct,
                messages: messages
              }
            });
          } else {
            // Normal conversation continue
            sendEvent({
              type: 'done',
              payload: {
                agentId: sessionAgentId,
                status: 'IDLE',
                reply: replyContent,
                messages: messages,
                checkout: currentCheckout,
                product: currentProduct
              }
            });
          }

          controller.close();
        } catch (err: any) {
          console.error(err);
          await logAuditEvent(sessionAgentId, 'SYSTEM_ERROR', { error: err.message });
          sendEvent({ type: 'done', payload: { status: 'FAILED', reason: err.message } });
          controller.close();
        }
      }
    });

    return new NextResponse(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive'
      }
    });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
