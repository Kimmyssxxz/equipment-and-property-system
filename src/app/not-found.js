import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
      <h2 className="text-2xl font-black text-slate-900">404 - Page Not Found</h2>
      <p className="text-xs text-slate-500 mt-2">The requested inventory module or asset could not be found.</p>
      <Link
        href="/"
        className="mt-4 px-5 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-200 transition-all"
      >
        Return to Dashboard
      </Link>
    </div>
  );
}
