import { defineAction, ActionError } from "astro:actions";
import { z } from "astro:schema";
import { getPdsAgent } from "@fujocoded/authproto/helpers";

const MAX_AVATAR_SIZE = 1_000_000; // 1MB
const ALLOWED_MIME_TYPES = ["image/png", "image/jpeg", "image/webp"];

export const blobRefSchema = z.object({
  $type: z.literal("blob"),
  ref: z.object({ $link: z.string() }),
  mimeType: z.string(),
  size: z.number().positive(),
});
export type BlobRef = z.infer<typeof blobRefSchema>;

export const server = {
  uploadAvatar: defineAction({
    accept: "form",
    input: z.object({
      avatar: z.instanceof(File),
    }),
    handler: async ({ avatar }, context) => {
      const { loggedInUser } = context.locals;
      if (!loggedInUser) throw new ActionError({ code: "UNAUTHORIZED" });

      if (!ALLOWED_MIME_TYPES.includes(avatar.type)) {
        throw new ActionError({
          code: "BAD_REQUEST",
          message: "Avatar must be PNG, JPEG, or WebP",
        });
      }
      if (avatar.size > MAX_AVATAR_SIZE) {
        throw new ActionError({
          code: "BAD_REQUEST",
          message: "Avatar must be under 1MB",
        });
      }
      if (avatar.size === 0) {
        throw new ActionError({
          code: "BAD_REQUEST",
          message: "Avatar file is empty",
        });
      }

      const pdsAgent = await getPdsAgent({ loggedInUser });
      if (!pdsAgent)
        throw new ActionError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to connect to PDS",
        });

      const arrayBuffer = await avatar.arrayBuffer();
      const uint8 = new Uint8Array(arrayBuffer);
      const { data } = await pdsAgent.com.atproto.repo.uploadBlob(uint8, {
        encoding: avatar.type,
      });
      return {
        $type: "blob" as const,
        ref: { $link: data.blob.ref.toString() },
        mimeType: data.blob.mimeType,
        size: data.blob.size,
      };
    },
  }),

  saveProfile: defineAction({
    input: z.object({
      displayName: z.string().max(64).optional(),
      description: z.string().max(256).optional(),
      bio: z.string().max(10000).optional(),
      pronouns: z.string().max(64).optional(),
      website: z.string().max(256).optional(),
      interests: z.array(z.string().max(64)).max(20).optional(),
      homeTown: z.object({ name: z.string(), value: z.string() }).optional(),
      avatar: blobRefSchema.optional(),
    }),
    handler: async (input, context) => {
      const { loggedInUser } = context.locals;
      if (!loggedInUser) throw new ActionError({ code: "UNAUTHORIZED" });

      const pdsAgent = await getPdsAgent({ loggedInUser });
      if (!pdsAgent)
        throw new ActionError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to connect to PDS",
        });

      // Preserve existing createdAt on update, set new on create
      let createdAt: string = new Date().toISOString();
      try {
        const existing = await pdsAgent.com.atproto.repo.getRecord({
          repo: loggedInUser.did,
          collection: "org.atmosphereconf.profile",
          rkey: "self",
        });
        const existingCreatedAt = (existing.data.value as any)?.createdAt;
        if (typeof existingCreatedAt === "string")
          createdAt = existingCreatedAt;
      } catch {
        // No existing record — use new timestamp
      }

      const record: Record<string, unknown> = {
        $type: "org.atmosphereconf.profile",
        ...input,
        createdAt,
      };

      if (input.avatar) {
        record.avatar = input.avatar;
      }

      const { data } = await pdsAgent.com.atproto.repo.putRecord({
        repo: loggedInUser.did,
        collection: "org.atmosphereconf.profile",
        rkey: "self",
        record,
      });
      return { uri: data.uri };
    },
  }),
};
