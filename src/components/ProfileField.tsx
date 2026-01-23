import type { ReactNode } from "react";

export function ProfileField(
  { label, children }: { label: string; children: ReactNode },
) {
  return (
    <div className="mb-3">
      <div className="text-xs text-gray-500 uppercase tracking-wide">{label}</div>
      <div className="text-gray-900 mt-0.5">{children}</div>
    </div>
  );
}
