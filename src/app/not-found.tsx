import Link from "next/link";

// Force dynamic rendering to prevent static generation errors with client-side dependencies
export const dynamic = 'force-dynamic';

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 py-16">
      <h1 className="font-serif text-5xl font-bold text-foreground">
        PRESTIX<span className="text-red-500">.vip</span>
      </h1>
      <p className="mt-4 text-xl text-foreground opacity-80">404 — Page not found</p>
      <p className="mt-2 text-sm text-foreground opacity-60">
        The page you’re looking for doesn’t exist or has been moved.
      </p>
      <Link
        href="/"
        className="mt-8 rounded-lg bg-foreground px-6 py-3 text-sm font-medium text-background hover:opacity-90"
      >
        Back to home
      </Link>
    </div>
  );
}
