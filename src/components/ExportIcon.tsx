"use client";

/** Export / download icon: square with upward arrow (data leaving the box). */
export function ExportIcon({ className }: { className?: string }) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <rect x="4" y="4" width="16" height="16" rx="1" />
      <path d="M12 8v8M9 11l3-3 3 3" />
    </svg>
  );
}
