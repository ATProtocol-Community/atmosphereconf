import { useEffect, useState } from "react";
// Simple SSR-friendly avatar

export interface AvatarProps extends React.ComponentPropsWithoutRef<"span"> {
  src?: string;
  alt?: string;
  size?: "sm" | "md" | "lg";
}

export function Avatar({
  className,
  src,
  alt,
  size = "sm",
  ...props
}: AvatarProps) {
  const sizeMap: Record<
    NonNullable<AvatarProps["size"]>,
    { box: string; text: string }
  > = {
    sm: { box: "size-8", text: "text-sm" },
    md: { box: "size-12", text: "text-base" },
    lg: { box: "size-16", text: "text-xl" },
  };
  const fallbackText = alt?.charAt(0).toUpperCase() ?? "?";
  const showFallback = !src;

  return (
    <span
      className={`relative flex shrink-0 overflow-hidden rounded-full ${sizeMap[size].box} ${
        className || ""
      }`.trim()}
      {...props}
    >
      {src && (
        <img
          className="aspect-square size-full object-cover"
          src={src}
          alt={alt ?? ""}
        />
      )}
      {showFallback && (
        <span
          className={`bg-muted text-foreground flex size-full items-center justify-center rounded-full ${
            sizeMap[size].text
          }`.trim()}
        >
          {fallbackText}
        </span>
      )}
    </span>
  );
}
