import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
      <h1 className="text-6xl font-black mb-4 tracking-tight">404</h1>
      <h2 className="text-2xl font-bold mb-6">Page Not Found</h2>
      <p className="text-gray-400 mb-8 max-w-md">
        We couldn't find the page or product you were looking for. It might have been removed or the link might be broken.
      </p>
      <Link 
        href="/products" 
        className="bg-white text-black px-8 py-3 font-medium hover:bg-gray-200 transition-colors"
      >
        Return to Shop
      </Link>
    </div>
  );
}
