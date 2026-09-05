export const metadata = {
  title: 'Shipping Policy - Aster Gear',
}

export default function ShippingPage() {
  return (
    <div className="max-w-3xl mx-auto py-16 px-4 sm:py-24 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">Shipping Policy</h1>
      <div className="mt-8 prose prose-indigo text-gray-500">
        <p>At Aster Gear, we strive to deliver your sports gear as quickly as possible.</p>
        <h2>Standard Shipping</h2>
        <p>Orders are typically processed within 1-2 business days. Standard shipping takes 3-5 business days across most regions.</p>
        <h2>Free Shipping</h2>
        <p>We offer free standard shipping on all orders over ₹2000.</p>
      </div>
    </div>
  )
}
