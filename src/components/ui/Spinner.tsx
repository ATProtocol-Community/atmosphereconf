interface SpinnerProps {
  className?: string;
  size?: number;
}

export function Spinner({ className = "", size = 48 }: SpinnerProps) {
  return (
    <svg
      className={`animate-spin text-primary ${className}`.trim()}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}
