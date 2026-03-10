import type { AppBskyEmbedExternal } from "@atproto/api";

export function PostExternalEmbed({
  external,
}: {
  external: AppBskyEmbedExternal.ViewExternal;
}) {
  let hostname: string;
  try {
    hostname = new URL(external.uri).hostname;
  } catch {
    hostname = external.uri;
  }

  return (
    <a
      href={external.uri}
      target="_blank"
      rel="noopener noreferrer"
      className="block mt-2 border border-border rounded-lg overflow-hidden hover:bg-muted/50 transition-colors"
    >
      {external.thumb && (
        <img
          src={external.thumb}
          alt={external.title || ""}
          className="w-full h-40 object-cover"
          loading="lazy"
        />
      )}
      <div className="p-3">
        <p className="text-xs text-muted-foreground">{hostname}</p>
        {external.title && (
          <p className="font-semibold text-sm mt-0.5 line-clamp-2">
            {external.title}
          </p>
        )}
        {external.description && (
          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
            {external.description}
          </p>
        )}
      </div>
    </a>
  );
}
