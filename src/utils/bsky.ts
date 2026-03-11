export function buildPostUrl(did: string, uri: string): string {
  return `https://bsky.app/profile/${did}/post/${uri.split("/").pop()}`;
}
