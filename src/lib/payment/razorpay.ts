import Razorpay from 'razorpay'
import crypto from 'crypto'

if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
  console.warn('RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET is missing. Payment functionality will fail.');
}

export const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || '',
  key_secret: process.env.RAZORPAY_KEY_SECRET || '',
})

export async function createRazorpayOrder(amount: number, currency: string, receipt: string) {
  try {
    const options = {
      amount, // amount in smallest currency unit (e.g. paise)
      currency,
      receipt,
      payment_capture: 1 // auto capture
    }
    const order = await razorpay.orders.create(options)
    return order
  } catch (error) {
    console.error('Error creating Razorpay order:', error)
    throw error
  }
}

export function verifyWebhookSignature(body: string, signature: string) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET || ''
  if (!secret) return false
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(body)
    .digest('hex')

  return expectedSignature === signature
}

export function verifyPaymentSignature(orderId: string, paymentId: string, signature: string) {
  const secret = process.env.RAZORPAY_KEY_SECRET || ''
  if (!secret) return false
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(`${orderId}|${paymentId}`)
    .digest('hex')
    
  return expectedSignature === signature
}
