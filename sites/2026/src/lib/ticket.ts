import { getLiveCollection } from "astro:content";

export type TicketInfo = {
  ticketSlug: string;
  ticketEditUrl: string;
};

/**
 * Look up ticket info for a handle. Returns null if not a ticket holder.
 */
export async function getTicketInfo(
  handle: string,
): Promise<TicketInfo | null> {
  const { entries, error } = await getLiveCollection("titoHandles");
  if (error) throw error;
  if (!entries) return null;
  const normalized = handle.trim().replace(/^@/, "").toLowerCase();
  const entry = entries.find(
    (e) => e.data.handle.trim().replace(/^@/, "").toLowerCase() === normalized,
  );
  if (!entry) return null;
  return {
    ticketSlug: entry.data.ticketSlug,
    ticketEditUrl: `https://ti.to/tickets/${entry.data.ticketSlug}`,
  };
}
