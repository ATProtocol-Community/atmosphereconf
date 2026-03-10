import type {
  AppBskyFeedDefs,
  AppBskyEmbedImages,
  AppBskyEmbedExternal,
  AppBskyEmbedRecord,
  AppBskyEmbedRecordWithMedia,
  AppBskyEmbedVideo,
} from "@atproto/api";
import { PostImages } from "./PostImages";
import { PostExternalEmbed } from "./PostExternalEmbed";
import { PostVideo } from "./PostVideo";
import { PostQuoteEmbed } from "./PostQuoteEmbed";

export function PostEmbed({
  embed,
  bskyUrl,
}: {
  embed: AppBskyFeedDefs.PostView["embed"];
  bskyUrl: string;
}) {
  if (!embed) return null;
  const type = embed.$type as string;

  if (type === "app.bsky.embed.images#view")
    return (
      <PostImages images={(embed as AppBskyEmbedImages.View).images} />
    );
  if (type === "app.bsky.embed.external#view")
    return (
      <PostExternalEmbed
        external={(embed as AppBskyEmbedExternal.View).external}
      />
    );
  if (type === "app.bsky.embed.video#view") {
    const v = embed as AppBskyEmbedVideo.View;
    return (
      <PostVideo
        thumbnail={v.thumbnail}
        alt={v.alt}
        aspectRatio={v.aspectRatio}
        bskyUrl={bskyUrl}
      />
    );
  }
  if (type === "app.bsky.embed.record#view")
    return (
      <PostQuoteEmbed record={(embed as AppBskyEmbedRecord.View).record} />
    );
  if (type === "app.bsky.embed.recordWithMedia#view") {
    const rwm = embed as AppBskyEmbedRecordWithMedia.View;
    return (
      <>
        <PostEmbed
          embed={rwm.media as AppBskyFeedDefs.PostView["embed"]}
          bskyUrl={bskyUrl}
        />
        <PostQuoteEmbed
          record={(rwm.record as AppBskyEmbedRecord.View).record}
        />
      </>
    );
  }
  return null;
}
