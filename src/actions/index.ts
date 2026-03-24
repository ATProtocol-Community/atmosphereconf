import { defineAction, ActionError } from "astro:actions";
import { z } from "astro:schema";
import { getPdsAgent } from "@fujocoded/authproto/helpers";
import { fetchFeedPage, fetchAuthorFeedPage } from "@/lib/bsky";
import {
  createBadgeAwardRecord,
  loadSigningKey,
  getBadgeRkey,
  verifyBadgeAward,
  BADGE_COLLECTION,
} from "@fujocoded/atproto-badge";
import type { BadgeAward } from "@fujocoded/atproto-badge";
import {
  isTicketHolder,
  getExistingBadgeAward,
  getBadgeDefinitionRef,
  getOrganizerDid,
} from "@/lib/badge";
import { BADGE_SIGNING_KEY } from "astro:env/server";

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
  getAuthorFeedPage: defineAction({
    input: z.object({
      actor: z.string(),
      cursor: z.string().optional(),
    }),
    handler: async ({ actor, cursor }) => {
      return fetchAuthorFeedPage(actor, cursor);
    },
  }),

  getFeedPage: defineAction({
    input: z.object({
      cursor: z.string().optional(),
    }),
    handler: async ({ cursor }) => {
      return fetchFeedPage(cursor);
    },
  }),

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

  claimBadge: defineAction({
    handler: async (_input, context) => {
      const { loggedInUser } = context.locals;
      if (!loggedInUser) throw new ActionError({ code: "UNAUTHORIZED" });

      const badgeRef = getBadgeDefinitionRef();
      if (!badgeRef || !BADGE_SIGNING_KEY) {
        throw new ActionError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Badge system not configured",
        });
      }

      // Verify ticket holder
      let ticketHolder: boolean;
      try {
        ticketHolder = await isTicketHolder(loggedInUser.handle);
      } catch {
        throw new ActionError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Could not verify ticket status. Please try again.",
        });
      }
      if (!ticketHolder) {
        throw new ActionError({
          code: "FORBIDDEN",
          message: "Badge is only available to ticket holders",
        });
      }

      // Check for existing award
      let existing: { uri: string } | null;
      try {
        existing = await getExistingBadgeAward(loggedInUser.did);
      } catch {
        throw new ActionError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Could not check existing badges. Please try again.",
        });
      }
      if (existing) {
        return { uri: existing.uri, alreadyClaimed: true };
      }

      // Load signing key
      const signingKey = await loadSigningKey({
        privateKeyBase64url: BADGE_SIGNING_KEY,
      });

      // Create badge award record
      const organizerDid = await getOrganizerDid();
      const record = await createBadgeAwardRecord({
        recipientDid: loggedInUser.did,
        badgeRef,
        organizerDid,
        signingKey,
      });

      // Write to attendee's repo
      const pdsAgent = await getPdsAgent({ loggedInUser });
      if (!pdsAgent) {
        throw new ActionError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to connect to PDS",
        });
      }

      const rkey = getBadgeRkey({ badgeDefinitionUri: badgeRef.uri });
      try {
        const { data } = await pdsAgent.com.atproto.repo.putRecord({
          repo: loggedInUser.did,
          collection: BADGE_COLLECTION,
          rkey,
          record,
        });
        return { uri: data.uri, alreadyClaimed: false };
      } catch (err: unknown) {
        // If the record already exists at this rkey, treat as success
        if (
          err instanceof Error &&
          err.message.includes("conflict")
        ) {
          return { uri: `at://${loggedInUser.did}/${BADGE_COLLECTION}/${rkey}`, alreadyClaimed: true };
        }
        throw new ActionError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to write badge. Please try again.",
        });
      }
    },
  }),

  verifyBadge: defineAction({
    input: z.object({
      did: z.string(),
    }),
    handler: async ({ did }) => {
      const badgeRef = getBadgeDefinitionRef();
      if (!badgeRef) {
        throw new ActionError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Badge system not configured",
        });
      }

      const pdsAgent = await getPdsAgent({ didOrHandle: did });
      if (!pdsAgent) {
        throw new ActionError({
          code: "NOT_FOUND",
          message: "Could not connect to user's PDS",
        });
      }

      // Find the badge award record
      const { data } = await pdsAgent.com.atproto.repo.listRecords({
        repo: did,
        collection: BADGE_COLLECTION,
        limit: 100,
      });

      const awardRecord = data.records.find((rec) => {
        const value = rec.value as Record<string, unknown>;
        const badge = value.badge as { uri?: string } | undefined;
        return badge?.uri === badgeRef.uri;
      });

      if (!awardRecord) {
        return { verified: false, error: "Badge award not found" };
      }

      try {
        const result = await verifyBadgeAward({
          award: awardRecord.value as BadgeAward,
        });

        // Resolve issuer handle + display name
        let issuerHandle: string | undefined;
        let issuerDisplayName: string | undefined;
        if (result.issuerDid) {
          try {
            const { IdResolver } = await import("@atproto/identity");
            const idResolver = new IdResolver();
            const doc = await idResolver.did.resolve(result.issuerDid);
            if (doc?.alsoKnownAs) {
              const handleUri = doc.alsoKnownAs.find((u: string) =>
                u.startsWith("at://"),
              );
              if (handleUri) issuerHandle = handleUri.replace("at://", "");
            }
          } catch {
            // non-critical
          }
          try {
            const issuerAgent = await getPdsAgent({
              didOrHandle: result.issuerDid,
            });
            if (issuerAgent) {
              const { data: profile } =
                await issuerAgent.com.atproto.repo.getRecord({
                  repo: result.issuerDid,
                  collection: "app.bsky.actor.profile",
                  rkey: "self",
                });
              const val = profile.value as Record<string, unknown>;
              issuerDisplayName = val.displayName as string | undefined;
            }
          } catch {
            // non-critical — fall back to handle/DID
          }
        }

        return { ...result, issuerHandle, issuerDisplayName };
      } catch {
        throw new ActionError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Verification failed",
        });
      }
    },
  }),

  unclaimBadge: defineAction({
    handler: async (_input, context) => {
      const { loggedInUser } = context.locals;
      if (!loggedInUser) throw new ActionError({ code: "UNAUTHORIZED" });

      const badgeRef = getBadgeDefinitionRef();
      if (!badgeRef) {
        throw new ActionError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Badge system not configured",
        });
      }

      const pdsAgent = await getPdsAgent({ loggedInUser });
      if (!pdsAgent) {
        throw new ActionError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to connect to PDS",
        });
      }

      const rkey = getBadgeRkey({ badgeDefinitionUri: badgeRef.uri });
      await pdsAgent.com.atproto.repo.deleteRecord({
        repo: loggedInUser.did,
        collection: BADGE_COLLECTION,
        rkey,
      });

      return { success: true };
    },
  }),
};
