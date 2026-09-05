export const metadata = {
  title: 'Returns - Aster Gear',
}

export default function ReturnsPage() {
  return (
    <div className="max-w-3xl mx-auto py-16 px-4 sm:py-24 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">Return Policy</h1>
      <div className="mt-8 prose prose-indigo text-gray-500">
        <p>We want you to be completely satisfied with your Aster Gear purchase.</p>
        <h2>30-Day Returns</h2>
        <p>You can return any unworn, unwashed items within 30 days of delivery for a full refund.</p>
        <h2>Exceptions</h2>
        <p>Items marked as final sale or customized gear cannot be returned.</p>
      </div>
    </div>
  )
}
