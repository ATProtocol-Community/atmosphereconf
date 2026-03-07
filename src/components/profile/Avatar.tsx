import { useState } from "react";

export interface AvatarProps extends React.ComponentPropsWithoutRef<"div"> {
  src?: string;
  alt?: string;
  fallback?: string;
  size?: "sm" | "md" | "lg";
}

const sizeClass = { sm: "size-8", md: "size-12", lg: "size-16" } as const;

export function Avatar({
  className,
  src,
  alt,
  fallback,
  size = "sm",
  ...props
}: AvatarProps) {
  const [imgFailed, setImgFailed] = useState(false);

  const fallbackText = fallback;

  return (
    <div
      className={`relative isolate flex shrink-0 overflow-hidden rounded-full border border-gray-200 bg-gray-100 text-gray-900 ${sizeClass[size]} ${className ?? ""}`.trim()}
      {...props}
    >
      {fallbackText ? (
        <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 font-medium">
          {fallbackText}
        </span>
      ) : (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="currentColor"
          className="absolute top-1/2 left-1/2 mt-[15%] size-full -translate-x-1/2 -translate-y-1/2 text-gray-400"
        >
          <path
            fillRule="evenodd"
            d="M7.5 6a4.5 4.5 0 1 1 9 0 4.5 4.5 0 0 1-9 0ZM3.751 20.105a8.25 8.25 0 0 1 16.498 0 .75.75 0 0 1-.437.695A18.683 18.683 0 0 1 12 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 0 1-.437-.695Z"
            clipRule="evenodd"
          />
        </svg>
      )}
      {src && !imgFailed && (
        <img
          src={src}
          alt={alt ?? ""}
          className="z-10 aspect-square size-full object-cover text-transparent"
          onError={() => setImgFailed(true)}
        />
      )}
    </div>
  );
}
