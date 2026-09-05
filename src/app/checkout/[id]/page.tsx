'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useCartStore } from '@/lib/cart-store'

export default function CheckoutPage() {
  const params = useParams()
  const router = useRouter()
  const { clearCart } = useCartStore()
  const checkoutId = params.id as string

  const [checkoutData, setCheckoutData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'processing' | 'success'>('idle')

  useEffect(() => {
    // Load Razorpay script
    const script = document.createElement('script')
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.async = true
    document.body.appendChild(script)

    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script)
      }
    }
  }, [])

  useEffect(() => {
    async function fetchCheckout() {
      try {
        const res = await fetch(`/api/checkout/${checkoutId}`)
        if (!res.ok) throw new Error('Failed to fetch checkout')
        const data = await res.json()
        setCheckoutData(data)
      } catch (e: any) {
        setError(e.message)
      } finally {
        setLoading(false)
      }
    }
    fetchCheckout()
  }, [checkoutId])

  const handlePayment = async () => {
    if (!checkoutData || !(window as any).Razorpay) return
    setPaymentStatus('processing')

    try {
      // 1. Complete the checkout session to generate the Order and Razorpay order_id
      const completeRes = await fetch(`/api/checkout/${checkoutId}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      })
      
      const orderData = await completeRes.json()
      
      if (!completeRes.ok || orderData.error) {
        throw new Error(orderData.error || 'Failed to initialize payment gateway')
      }

      // 2. Open Razorpay with the generated order_id
      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: Math.round(checkoutData.amount * 100), // in paise
        currency: checkoutData.currency,
        name: 'Agentic Commerce',
        description: 'Standard Checkout',
        order_id: orderData.razorpayOrderId, // Add the mandatory order_id
        handler: async function (response: any) {
          try {
            const verifyRes = await fetch(`/api/checkout/${checkoutId}/verify`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_signature: response.razorpay_signature
              })
            })
            
            if (verifyRes.ok) {
              setPaymentStatus('success')
              clearCart()
            } else {
              throw new Error('Payment verification failed')
            }
          } catch (e) {
            console.error(e)
            alert('Payment verification failed. Please contact support.')
            setPaymentStatus('idle')
          }
        },
        prefill: {
          name: 'Demo User',
          email: 'demo@example.com',
          contact: '9999999999'
        },
        theme: {
          color: '#191817'
        }
      }

      const rzp = new (window as any).Razorpay(options)
      
      rzp.on('payment.failed', function (response: any) {
        alert(`Payment Failed: ${response.error.description}`)
        setPaymentStatus('idle')
      })
      
      rzp.open()
    } catch (e: any) {
      console.error(e)
      alert(e.message || 'Failed to start payment. Please try again.')
      setPaymentStatus('idle')
    }
  }

  if (loading) {
    return (
      <div className="min-h-[70vh] flex justify-center items-center bg-[var(--color-porcelain-canvas)]">
        <div className="w-8 h-8 border-4 border-[var(--color-obsidian)] border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  if (error || !checkoutData) {
    return (
      <div className="min-h-[70vh] flex flex-col justify-center items-center bg-[var(--color-porcelain-canvas)]">
        <h1 className="text-[24px] font-medium text-[var(--color-obsidian)] uppercase mb-[16px]">Checkout Error</h1>
        <p className="text-[var(--color-graphite)]">{error || 'Checkout session not found'}</p>
        <Link href="/cart" className="mt-[24px] border border-[var(--color-obsidian)] px-[24px] py-[8px] rounded-[40px] uppercase text-[12px] font-medium hover:bg-[var(--color-obsidian)] hover:text-white transition-colors">
          Return to Cart
        </Link>
      </div>
    )
  }

  if (paymentStatus === 'success' || checkoutData.status === 'COMPLETED') {
    return (
      <div className="min-h-[70vh] flex flex-col justify-center items-center bg-[var(--color-porcelain-canvas)]">
        <div className="w-[64px] h-[64px] rounded-full bg-green-100 flex items-center justify-center mb-[24px]">
          <svg className="w-[32px] h-[32px] text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="text-[24px] font-medium text-[var(--color-obsidian)] uppercase mb-[16px]">Payment Successful</h1>
        <p className="text-[var(--color-graphite)] max-w-sm text-center mb-[32px]">Your order has been placed securely via Agentic Commerce.</p>
        <Link href="/" className="border border-[var(--color-obsidian)] px-[24px] py-[8px] rounded-[40px] uppercase text-[12px] font-medium bg-[var(--color-obsidian)] text-white hover:bg-black transition-colors">
          Continue Shopping
        </Link>
      </div>
    )
  }

  return (
    <div className="bg-[var(--color-porcelain-canvas)] min-h-[70vh] py-[80px]">
      <div className="max-w-[var(--page-max-width)] mx-auto px-4 sm:px-[25px]">
        <h1 className="text-[36px] font-medium tracking-[var(--tracking-heading)] text-[var(--color-obsidian)] uppercase mb-[60px] border-b border-[var(--color-mist)] pb-[40px]">
          Secure Checkout
        </h1>

        <div className="max-w-2xl mx-auto border border-[var(--color-mist)] p-[40px] bg-[var(--color-bone)]">
          <h2 className="text-[14px] font-medium uppercase tracking-[0.143em] text-[var(--color-graphite)] mb-[32px]">Order Summary</h2>
          
          <div className="space-y-[16px] mb-[40px]">
            {checkoutData.lineItems.map((item: any, idx: number) => (
              <div key={idx} className="flex justify-between items-center text-[16px] text-[var(--color-obsidian)] border-b border-[var(--color-mist)] pb-[16px]">
                <span>Product ID: {item.productId.split('_')[1] || item.productId} (x{item.quantity})</span>
                <span className="font-medium">₹{item.priceAmount * item.quantity}</span>
              </div>
            ))}
          </div>

          <div className="flex justify-between items-center text-[24px] font-medium text-[var(--color-obsidian)] uppercase mb-[40px]">
            <span>Total</span>
            <span>{checkoutData.currency} {checkoutData.amount}</span>
          </div>

          <button
            type="button"
            onClick={handlePayment}
            disabled={paymentStatus === 'processing'}
            className="w-full h-[56px] rounded-[40px] bg-[var(--color-obsidian)] text-white text-[14px] font-medium uppercase hover:bg-black transition-colors disabled:opacity-50"
          >
            {paymentStatus === 'processing' ? 'Processing...' : 'Pay Now'}
          </button>
        </div>
      </div>
    </div>
  )
}
