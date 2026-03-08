import { tokenize, type Token } from "@atcute/bluesky-richtext-parser";

type Segment =
  | { kind: "text"; content: string }
  | { kind: "br" }
  | { kind: "link"; href: string; text: string };

function flattenTokens(tokens: Token[]): Segment[] {
  return tokens.flatMap((token): Segment[] => {
    switch (token.type) {
      case "mention":
        return [
          {
            kind: "link",
            href: `https://bsky.app/profile/${token.handle}`,
            text: token.raw,
          },
        ];
      case "topic":
        return [
          {
            kind: "link",
            href: `https://bsky.app/search?q=${encodeURIComponent("#" + token.name)}`,
            text: token.raw,
          },
        ];
      case "autolink":
        return [{ kind: "link", href: token.url, text: token.raw }];
      case "link":
        return [
          {
            kind: "link",
            href: token.url,
            text: token.children.map((c) => c.raw).join(""),
          },
        ];
      case "escape":
        return [{ kind: "text", content: token.escaped }];
      default: {
        const parts = token.raw.split("\n");
        return parts.flatMap((part, i): Segment[] =>
          i < parts.length - 1
            ? [{ kind: "text", content: part }, { kind: "br" }]
            : [{ kind: "text", content: part }],
        );
      }
    }
  });
}

export function RichText({
  text,
  className,
}: {
  text: string;
  className?: string;
}) {
  const segments = flattenTokens(tokenize(text));
  return (
    <span className={className}>
      {segments.map((seg, i) =>
        seg.kind === "link" ? (
          <a
            key={i}
            href={seg.href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline"
          >
            {seg.text}
          </a>
        ) : seg.kind === "br" ? (
          <br key={i} />
        ) : (
          <span key={i}>{seg.content}</span>
        ),
      )}
    </span>
  );
}
