import type { AppBskyEmbedExternal } from "@atproto/api";

export function PostExternalEmbed({
  external,
  nested,
}: {
  external: AppBskyEmbedExternal.ViewExternal;
  nested?: boolean;
}) {
  let hostname: string;
  try {
    hostname = new URL(external.uri).hostname;
  } catch {
    hostname = external.uri;
  }

  const Tag = nested ? "div" : "a";
  const linkProps = nested
    ? {}
    : { href: external.uri, target: "_blank" as const, rel: "noopener noreferrer" };

  return (
    <Tag
      {...linkProps}
      className="border-border hover:bg-muted/50 mt-2 block overflow-hidden rounded-lg border transition-colors"
    >
      {external.thumb && (
        <img
          src={external.thumb}
          alt={external.title || ""}
          className="h-40 w-full object-cover"
          loading="lazy"
        />
      )}
      <div className="p-3">
        <p className="text-muted-foreground text-xs">{hostname}</p>
        {external.title && (
          <p className="mt-0.5 line-clamp-2 text-sm font-semibold">
            {external.title}
          </p>
        )}
        {external.description && (
          <p className="text-muted-foreground mt-1 line-clamp-2 text-xs">
            {external.description}
          </p>
        )}
      </div>
    </Tag>
  );
}
