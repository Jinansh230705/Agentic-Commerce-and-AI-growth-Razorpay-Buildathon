import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyPaymentSignature } from '@/lib/payment/razorpay'

export async function POST(req: NextRequest, { params }: any) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { razorpay_payment_id, razorpay_order_id, razorpay_signature } = body;

    if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature) {
      return NextResponse.json({ error: 'Missing required Razorpay parameters' }, { status: 400 });
    }

    const order = await prisma.order.findUnique({
      where: { checkoutSessionId: id }
    });

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    if (order.razorpayOrderId !== razorpay_order_id) {
      return NextResponse.json({ error: 'Order ID mismatch' }, { status: 400 });
    }

    // Verify signature
    const isValid = verifyPaymentSignature(razorpay_order_id, razorpay_payment_id, razorpay_signature);
    if (!isValid) {
      return NextResponse.json({ error: 'Invalid payment signature' }, { status: 400 });
    }

    // Update order status
    await prisma.$transaction([
      prisma.order.update({
        where: { orderId: order.orderId },
        data: {
          paymentStatus: 'PAYMENT_VERIFIED',
          status: 'ORDER_CONFIRMED'
        }
      }),
      prisma.checkoutSession.update({
        where: { checkoutId: id },
        data: {
          status: 'SUCCESSFUL'
        }
      })
    ]);

    return NextResponse.json({ success: true, message: 'Payment verified successfully' }, { status: 200 });

  } catch (error) {
    console.error('Verify checkout error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
