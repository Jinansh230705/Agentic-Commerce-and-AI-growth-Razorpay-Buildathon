'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'

const loadRazorpay = () => {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') {
      resolve(false)
      return
    }
    if ((window as any).Razorpay) {
      resolve(true)
      return
    }
    const script = document.createElement('script')
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.onload = () => resolve(true)
    script.onerror = () => resolve(false)
    document.body.appendChild(script)
  })
}

function BuyerContent() {
  const searchParams = useSearchParams()
  const initialQuery = searchParams.get('q') || ''
  
  const [query, setQuery] = useState(initialQuery || '')
  const [status, setStatus] = useState('IDLE')
  const [logs, setLogs] = useState<{message: string, isError: boolean}[]>([])
  const [chatHistory, setChatHistory] = useState<{role: string, content: string}[]>([])
  const [checkoutData, setCheckoutData] = useState<any>(null)
  const [productData, setProductData] = useState<any>(null)
  const [agentId, setAgentId] = useState<string>('')

  // Auto-start if there's a query param
  useEffect(() => {
    if (initialQuery && status === 'IDLE') {
      startShopping(initialQuery)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialQuery])

  const friendlyLogMessage = (raw: string) => {
    if (raw.includes('searchMerchants')) return 'Searching Aster Gear for merchants...'
    if (raw.includes('getMerchantProfile')) return 'Connecting to merchant UCP profile...'
    if (raw.includes('searchProducts')) return 'Scanning catalog for matching gear...'
    if (raw.includes('createCheckout')) return 'Creating secure checkout session...'
    if (raw.includes('updateCheckout')) return 'Updating shipping information...'
    if (raw.includes('Executing tool:')) return 'Agent is acting on your behalf...'
    if (raw.includes('completed.')) return null // Skip boring completed messages
    return raw // Fallback
  }

  const startShopping = async (overrideQuery?: string) => {
    const activeQuery = typeof overrideQuery === 'string' ? overrideQuery : query
    setStatus('ANALYZING')
    setLogs([{ message: 'Understanding your requirements...', isError: false }])
    
    // Add user message to history
    const updatedHistory = overrideQuery 
        ? [{role: 'user', content: activeQuery}] 
        : [...chatHistory, {role: 'user', content: activeQuery}]
    
    setChatHistory(updatedHistory)
    setQuery('')

    try {
      const res = await fetch('/api/buyer/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: updatedHistory, agentId })
      })
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: 'Unknown error' }));
        setStatus('FAILED')
        setLogs(prev => [...prev, { message: `Error: ${errorData.reason || errorData.error}`, isError: true }])
        return
      }

      if (!res.body) {
         setStatus('FAILED');
         setLogs(prev => [...prev, { message: 'Error: Empty response body', isError: true }]);
         return;
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let done = false
      let buffer = ''

      while (!done) {
        const { value, done: doneReading } = await reader.read()
        done = doneReading
        if (value) {
          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n\n')
          buffer = lines.pop() || ''
          
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6))
                if (data.type === 'log') {
                  const friendly = friendlyLogMessage(data.message)
                  if (friendly) {
                    setLogs(prev => [...prev, { message: friendly, isError: false }])
                  }
                } else if (data.type === 'done') {
                  const payload = data.payload
                  if (payload.status === 'FAILED') {
                    setStatus('FAILED')
                    setLogs(prev => [...prev, { message: `Error: ${payload.reason}`, isError: true }])
                  } else {
                    if (payload.reply) {
                      setChatHistory(prev => [...prev, {role: 'assistant', content: payload.reply}])
                    }
                    if (payload.messages) {
                      // Only update agentId on first turn if it was missing
                      setAgentId(payload.agentId)
                    }
                    setStatus(payload.status)
                    if (payload.checkout) setCheckoutData(payload.checkout)
                    if (payload.product) setProductData(payload.product)
                    
                    if (payload.status === 'WAITING_FOR_CONFIRMATION') {
                      setLogs(prev => [...prev, { message: 'Waiting for explicit human authorization.', isError: false }])
                    }
                  }
                }
              } catch (e) {
                console.error('Failed to parse SSE line', line, e)
              }
            }
          }
        }
      }

    } catch (error: any) {
      setStatus('FAILED')
      setLogs(prev => [...prev, { message: `System error: ${error.message}`, isError: true }])
    }
  }

  const confirmCheckout = async () => {
    setStatus('AUTHORIZING')
    setLogs(prev => [...prev, { message: 'User explicitly authorizing transaction via AP2...', isError: false }])

    try {
      const authRes = await fetch('/api/buyer/authorize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ checkoutId: checkoutData.checkoutId, agentId })
      })
      const authData = await authRes.json()

      if (authData.error) {
        setStatus('FAILED')
        setLogs(prev => [...prev, { message: `Authorization failed: ${authData.error}`, isError: true }])
        return
      }

      setLogs(prev => [...prev, { message: `Authorization granted via wallet! Mandate ID: ${authData.mandateId}`, isError: false }])
      setStatus('COMPLETING')
      setLogs(prev => [...prev, { message: 'Initializing Razorpay Payment Gateway...', isError: false }])

      const res = await fetch(`/api/checkout/${checkoutData.checkoutId}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 'ap2.checkout_mandate': authData.mandateId })
      })
      const data = await res.json()

      if (data.error) {
        setStatus('FAILED')
        setLogs(prev => [...prev, { message: `Razorpay initialization failed: ${data.error}`, isError: true }])
        return
      }
      
      setLogs(prev => [...prev, { message: `Payment Order Created securely.`, isError: false }])

      const isLoaded = await loadRazorpay()
      if (!isLoaded) {
        setStatus('FAILED')
        setLogs(prev => [...prev, { message: `Failed to load secure payment gateway.`, isError: true }])
        return
      }

      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || '',
        amount: data.amount,
        currency: data.currency,
        name: 'Aster Gear',
        description: 'AI Buyer Authorized Checkout',
        order_id: data.razorpayOrderId,
        handler: async function (response: any) {
          try {
            const verifyRes = await fetch(`/api/checkout/${checkoutData.checkoutId}/verify`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_signature: response.razorpay_signature
              })
            })
            const verifyData = await verifyRes.json()
            if (verifyData.success) {
              setStatus('SUCCESSFUL')
              setLogs(prev => [...prev, { message: `Payment verified successfully!`, isError: false }])
            } else {
              setStatus('FAILED')
              setLogs(prev => [...prev, { message: `Payment verification failed: ${verifyData.error}`, isError: true }])
            }
          } catch (error) {
            setStatus('FAILED')
            setLogs(prev => [...prev, { message: `Verification error`, isError: true }])
          }
        },
        prefill: {
          name: 'AI Buyer User',
          email: 'buyer@example.com',
          contact: '9999999999'
        },
        theme: {
          color: '#000000'
        }
      }

      const rzp1 = new (window as any).Razorpay(options)
      rzp1.on('payment.failed', function (response: any) {
        setStatus('FAILED')
        setLogs(prev => [...prev, { message: `Payment Failed: ${response.error.description}`, isError: true }])
      })
      rzp1.open()

    } catch (error: any) {
      setStatus('FAILED')
      setLogs(prev => [...prev, { message: `Completion error: ${error.message}`, isError: true }])
    }
  }

  return (
    <div className="min-h-screen bg-[var(--color-porcelain-canvas)]">
      <div className="max-w-[var(--page-max-width)] mx-auto py-[80px] px-4 sm:px-[25px]">
        <div className="mb-[60px]">
          <Link href="/" className="text-[12px] font-medium uppercase tracking-[0.143em] text-[var(--color-graphite)] hover:text-[var(--color-obsidian)] transition-colors flex items-center gap-[8px]">
            &larr; Back to Store
          </Link>
        </div>

        <div className="bg-[var(--color-porcelain-canvas)] rounded-[24px] border border-[var(--color-mist)] shadow-sm overflow-hidden">
          <div className="bg-[var(--color-obsidian)] px-[40px] py-[60px] text-[var(--color-porcelain-canvas)]">
            <h1 className="text-[36px] font-medium tracking-[var(--tracking-heading)] uppercase mb-[16px] leading-[var(--leading-heading)]">AI Buyer</h1>
            <p className="text-white/70 text-[16px] max-w-2xl leading-[var(--leading-body)]">
              Experience the future of commerce. Tell your agent what you need, and it will negotiate, 
              verify availability, and prepare the checkout for you securely.
            </p>
          </div>

          <div className="p-[40px]">
            <div className="space-y-[60px]">
              {/* Chat History */}
              {chatHistory.length > 0 && (
                <div className="space-y-[16px] mb-[24px]">
                  {chatHistory.filter(msg => msg.role === 'user' || (msg.role === 'assistant' && (!(msg as any).tool_calls || (msg as any).tool_calls.length === 0))).map((msg, idx) => (
                    <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[80%] p-[16px] ${msg.role === 'user' ? 'bg-[var(--color-obsidian)] text-white rounded-[24px] rounded-br-sm' : 'bg-[var(--color-bone)] border border-[var(--color-mist)] text-[var(--color-obsidian)] rounded-[24px] rounded-bl-sm'}`}>
                        <p className="text-[14px] leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Query Input */}
              {status === 'IDLE' && (
                <div className="bg-[var(--color-bone)] rounded-[24px] border border-[var(--color-mist)] p-[32px]">
                  <label className="block text-[12px] font-medium uppercase tracking-[0.143em] text-[var(--color-obsidian)] mb-[16px]">Your Message</label>
                  <div className="relative flex flex-col gap-4">
                    <textarea 
                      value={query}
                      onChange={e => setQuery(e.target.value)}
                      placeholder="e.g. Find me some trail running shoes around ₹5,500 in size 9"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault()
                          startShopping()
                        }
                      }}
                      className="w-full bg-[var(--color-porcelain-canvas)] rounded-[16px] border border-[var(--color-mist)] focus:border-[var(--color-obsidian)] outline-none p-[16px] text-[16px] text-[var(--color-obsidian)] transition-colors"
                      rows={2}
                    />
                    <button 
                      onClick={() => startShopping()}
                      className="self-end bg-transparent border border-[var(--color-obsidian)] text-[var(--color-obsidian)] hover:bg-[var(--color-obsidian)] hover:text-[var(--color-porcelain-canvas)] font-medium uppercase tracking-[0.143em] text-[12px] py-[12px] px-[28px] rounded-[40px] transition-colors"
                    >
                      Send Message
                    </button>
                  </div>
                </div>
              )}

              {/* Status Stepper */}
              {status !== 'IDLE' && (
                <div className="border-t border-[var(--color-mist)] pt-[40px]">
                  <h3 className="text-[12px] font-medium uppercase tracking-[0.143em] text-[var(--color-graphite)] mb-[32px]">Agent Progress</h3>
                  <div className="flex items-center justify-between text-[12px] font-medium uppercase tracking-[0.143em]">
                    <div className={`flex flex-col items-center ${status !== 'IDLE' ? 'text-[var(--color-obsidian)]' : 'text-[var(--color-mist)]'}`}>
                      <div className={`w-[32px] h-[32px] flex items-center justify-center mb-[8px] ${status !== 'IDLE' ? 'bg-[var(--color-obsidian)] text-white' : 'bg-[var(--color-mist)] text-white'}`}>1</div>
                      <span>Discover</span>
                    </div>
                    <div className={`h-[1px] flex-1 mx-[16px] ${status === 'WAITING_FOR_CONFIRMATION' || status === 'AUTHORIZING' || status === 'COMPLETING' || status === 'SUCCESSFUL' ? 'bg-[var(--color-obsidian)]' : 'bg-[var(--color-mist)]'}`}></div>
                    <div className={`flex flex-col items-center ${status === 'WAITING_FOR_CONFIRMATION' || status === 'AUTHORIZING' || status === 'COMPLETING' || status === 'SUCCESSFUL' ? 'text-[var(--color-obsidian)]' : 'text-[var(--color-mist)]'}`}>
                      <div className={`w-[32px] h-[32px] flex items-center justify-center mb-[8px] ${status === 'WAITING_FOR_CONFIRMATION' || status === 'AUTHORIZING' || status === 'COMPLETING' || status === 'SUCCESSFUL' ? 'bg-[var(--color-obsidian)] text-white' : 'bg-[var(--color-mist)] text-white'}`}>2</div>
                      <span>Checkout</span>
                    </div>
                    <div className={`h-[1px] flex-1 mx-[16px] ${status === 'AUTHORIZING' || status === 'COMPLETING' || status === 'SUCCESSFUL' ? 'bg-[var(--color-obsidian)]' : 'bg-[var(--color-mist)]'}`}></div>
                    <div className={`flex flex-col items-center ${status === 'AUTHORIZING' || status === 'COMPLETING' || status === 'SUCCESSFUL' ? 'text-[var(--color-obsidian)]' : 'text-[var(--color-mist)]'}`}>
                      <div className={`w-[32px] h-[32px] flex items-center justify-center mb-[8px] ${status === 'AUTHORIZING' || status === 'COMPLETING' || status === 'SUCCESSFUL' ? (status === 'AUTHORIZING' ? 'bg-[var(--color-obsidian)] text-white animate-pulse' : 'bg-[var(--color-obsidian)] text-white') : 'bg-[var(--color-mist)] text-white'}`}>3</div>
                      <span>Authorize</span>
                    </div>
                    <div className={`h-[1px] flex-1 mx-[16px] ${status === 'SUCCESSFUL' ? 'bg-[var(--color-pure-ink)]' : status === 'FAILED' ? 'bg-red-500' : 'bg-[var(--color-mist)]'}`}></div>
                    <div className={`flex flex-col items-center ${status === 'SUCCESSFUL' ? 'text-[var(--color-pure-ink)]' : status === 'FAILED' ? 'text-red-600' : 'text-[var(--color-mist)]'}`}>
                      <div className={`w-[32px] h-[32px] flex items-center justify-center mb-[8px] ${status === 'SUCCESSFUL' ? 'bg-[var(--color-pure-ink)] text-white' : status === 'FAILED' ? 'bg-red-500 text-white' : 'bg-[var(--color-mist)] text-white'}`}>4</div>
                      <span>Complete</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Logs */}
              {logs.length > 0 && (
                <div className="bg-[var(--color-porcelain-canvas)] rounded-[24px] border border-[var(--color-mist)] p-[32px] overflow-hidden">
                  <div className="flex items-center mb-[24px] gap-[8px] border-b border-[var(--color-mist)] pb-[16px]">
                    <div className="w-[8px] h-[8px] rounded-full bg-[var(--color-pure-ink)]"></div>
                    <span className="ml-[8px] text-[10px] font-bold text-[var(--color-obsidian)] tracking-[0.143em] uppercase">Status Updates</span>
                  </div>
                  <div className="text-[14px] space-y-[12px] max-h-[240px] overflow-y-auto leading-relaxed">
                    {logs.map((log, i) => (
                      <div key={i} className="flex items-start">
                        <span className="text-[var(--color-graphite)] mr-[16px] text-[12px] pt-[2px]">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                          </svg>
                        </span>
                        <span className={log.isError ? 'text-red-600 font-medium' : 'text-[var(--color-obsidian)]'}>{log.message}</span>
                      </div>
                    ))}
                    {status === 'ANALYZING' && (
                      <div className="flex items-start animate-pulse">
                        <span className="text-[var(--color-graphite)] mr-[16px] text-[12px] pt-[2px]">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z" />
                          </svg>
                        </span>
                        <span className="text-[var(--color-graphite)]">Agent is thinking...</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Confirmation Gate */}
              {status === 'WAITING_FOR_CONFIRMATION' && checkoutData && productData && (
                <div className="border border-[var(--color-obsidian)] rounded-[24px] bg-[var(--color-porcelain-canvas)] p-[40px] relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-[4px] bg-[var(--color-obsidian)]"></div>
                  <div className="flex items-center justify-between mb-[40px]">
                    <h3 className="text-[24px] font-medium uppercase tracking-[var(--tracking-subheading)] text-[var(--color-obsidian)]">Human Authorization Required</h3>
                    <span className="bg-[var(--color-obsidian)] text-[var(--color-porcelain-canvas)] px-[12px] py-[6px] text-[9px] font-medium tracking-[0.143em] uppercase">Action Required</span>
                  </div>
                  
                  <div className="bg-[var(--color-bone)] p-[32px] border border-[var(--color-mist)] mb-[40px]">
                    <h4 className="text-[12px] font-medium text-[var(--color-graphite)] uppercase tracking-[0.143em] mb-[24px] border-b border-[var(--color-mist)] pb-[16px]">Transaction Details</h4>
                    <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-[24px] gap-y-[32px]">
                      <div>
                        <dt className="text-[9px] font-medium text-[var(--color-graphite)] uppercase tracking-[0.143em]">Merchant ID</dt>
                        <dd className="mt-[8px] text-[16px] font-medium text-[var(--color-obsidian)]">{productData.merchantId}</dd>
                      </div>
                      <div>
                        <dt className="text-[9px] font-medium text-[var(--color-graphite)] uppercase tracking-[0.143em]">Product</dt>
                        <dd className="mt-[8px] text-[16px] font-medium text-[var(--color-obsidian)]">{productData.name}</dd>
                      </div>
                      <div>
                        <dt className="text-[9px] font-medium text-[var(--color-graphite)] uppercase tracking-[0.143em]">Quantity</dt>
                        <dd className="mt-[8px] text-[16px] font-medium text-[var(--color-obsidian)]">1</dd>
                      </div>
                      <div>
                        <dt className="text-[9px] font-medium text-[var(--color-graphite)] uppercase tracking-[0.143em]">Destination</dt>
                        <dd className="mt-[8px] text-[16px] font-medium text-[var(--color-obsidian)]">{checkoutData.shippingAddress?.country || 'India'}</dd>
                      </div>
                      <div className="sm:col-span-2 bg-[var(--color-porcelain-canvas)] p-[24px] border border-[var(--color-obsidian)]">
                        <dt className="text-[9px] font-medium text-[var(--color-graphite)] uppercase tracking-[0.143em] mb-[8px]">Total Authorized Amount</dt>
                        <dd className="text-[36px] font-medium text-[var(--color-obsidian)] tracking-[var(--tracking-heading)]">{checkoutData.currency} {checkoutData.amount}</dd>
                      </div>
                    </dl>
                  </div>
                  
                  <p className="text-[12px] text-[var(--color-graphite)] font-normal mb-[40px] leading-[var(--leading-caption)]">By authorizing, you are cryptographically signing this transaction via your AP2 wallet. The agent will then complete the secure payment.</p>
                  
                  <div className="flex flex-col sm:flex-row space-y-[16px] sm:space-y-0 sm:space-x-[16px]">
                    <button 
                      onClick={confirmCheckout}
                      className="flex-1 bg-[var(--color-obsidian)] text-[var(--color-porcelain-canvas)] hover:bg-[var(--color-graphite)] font-medium uppercase tracking-[0.143em] text-[12px] py-[12px] px-[28px] rounded-[40px] transition-colors flex items-center justify-center gap-[12px]"
                    >
                      <svg className="w-[16px] h-[16px]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                      Authorize & Pay
                    </button>
                    <button 
                      onClick={() => {
                        setStatus('FAILED')
                        setLogs(prev => [...prev, { message: 'User rejected the transaction.', isError: true }])
                      }}
                      className="flex-1 bg-transparent border border-[var(--color-obsidian)] text-[var(--color-obsidian)] hover:bg-[var(--color-bone)] font-medium uppercase tracking-[0.143em] text-[12px] py-[12px] px-[28px] rounded-[40px] transition-colors"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              )}

              {/* Success State */}
              {status === 'SUCCESSFUL' && (
                <div className="mt-[40px] bg-[var(--color-porcelain-canvas)] border border-[var(--color-obsidian)] rounded-[24px] p-[60px] text-center overflow-hidden">
                  <div className="w-[64px] h-[64px] rounded-full bg-[var(--color-obsidian)] flex items-center justify-center mx-auto mb-[24px]">
                    <svg className="w-[32px] h-[32px] text-[var(--color-porcelain-canvas)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h3 className="text-[24px] font-medium uppercase tracking-[var(--tracking-subheading)] text-[var(--color-obsidian)] mb-[16px]">Order Complete</h3>
                  <p className="text-[16px] text-[var(--color-graphite)] mb-[40px] leading-[var(--leading-body)]">Your AI Buyer successfully negotiated, authorized, and paid for your order.</p>
                  <Link href="/products" className="inline-flex items-center justify-center py-[12px] px-[28px] bg-transparent border border-[var(--color-obsidian)] rounded-[40px] text-[12px] font-medium text-[var(--color-obsidian)] hover:bg-[var(--color-obsidian)] hover:text-[var(--color-porcelain-canvas)] transition-colors uppercase tracking-[0.143em]">
                    Shop More Gear
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function AIBuyerPage() {
  return (
    <Suspense fallback={<div className="p-[80px] text-center uppercase tracking-widest text-sm font-medium">Loading AI Buyer...</div>}>
      <BuyerContent />
    </Suspense>
  )
}
