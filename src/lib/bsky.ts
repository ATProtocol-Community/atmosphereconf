export function getBlobCDNUrl(
  did: string,
  blob: { $type: "blob"; ref: { $link: string } },
  type: "webp" | "jpeg" = "webp",
): string {
  return `https://cdn.bsky.app/img/feed_thumbnail/plain/${did}/${blob.ref.$link}@${type}`;
}
