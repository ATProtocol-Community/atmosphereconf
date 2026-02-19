import { useState, useEffect, useRef } from "react";
import * as Popover from "@radix-ui/react-popover";
import { Command } from "cmdk";
import { Spinner } from "@/components/ui/Spinner";
import { Avatar } from "@/components/profile/Avatar";
import { isAbortError } from "@/lib/client";

export interface Actor {
  did: string;
  handle: string;
  displayName?: string;
  avatar?: string;
}

interface ActorAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onSelect: (actor: Actor) => void;
  placeholder?: string;
  disabled?: boolean;
  id?: string;
  name?: string;
}

const DEBOUNCE_MS = 300;

async function fetchActors(
  query: string,
  signal?: AbortSignal,
): Promise<Actor[]> {
  const url = new URL(
    "https://public.api.bsky.app/xrpc/app.bsky.actor.searchActorsTypeahead",
  );
  url.searchParams.set("q", query);
  url.searchParams.set("limit", "5");
  const response = await fetch(url.toString(), { signal });
  if (!response.ok) {
    throw new Error(
      `Failed to fetch actors from Bluesky: ${response.statusText}`,
    );
  }
  return (await response.json())?.actors ?? [];
}

function ActorList({
  loading,
  actors,
  handleSelect,
}: {
  loading: boolean;
  actors: Actor[];
  handleSelect: (actor: Actor) => void;
}) {
  return (
    <Command.List className="py-1">
      {loading && actors.length === 0 ? (
        <div className="py-6 text-center text-sm text-gray-500">
          Searching...
        </div>
      ) : actors.length === 0 ? (
        <div className="py-6 text-center text-sm text-gray-500">
          No users found.
        </div>
      ) : (
        actors.map((actor) => (
          <Command.Item
            key={actor.did}
            value={actor.handle}
            onSelect={() => handleSelect(actor)}
            className="w-full px-3 py-2 text-left transition-colors flex items-center gap-2 data-[selected=true]:bg-gray-50"
          >
            <Avatar
              size="sm"
              src={actor.avatar}
              alt={actor.displayName || actor.handle}
            />
            <div className="flex flex-col min-w-0">
              {actor.displayName && (
                <span className="text-sm font-medium truncate">
                  {actor.displayName}
                </span>
              )}
              <span className="text-xs text-gray-500 truncate">
                @{actor.handle}
              </span>
            </div>
          </Command.Item>
        ))
      )}
    </Command.List>
  );
}

export function ActorAutocomplete({
  value,
  onChange,
  onSelect,
  placeholder = "you.bsky.social",
  disabled = false,
  id,
  name,
}: ActorAutocompleteProps) {
  const [open, setOpen] = useState(false);
  const [actors, setActors] = useState<Actor[]>([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced search effect
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    const query = value.trim();
    if (!query) {
      setActors([]);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    setLoading(true);

    debounceRef.current = setTimeout(async () => {
      try {
        const actors = await fetchActors(query, controller.signal);

        if (!controller.signal.aborted) {
          setActors(actors);
        }
      } catch (err: unknown) {
        if (!isAbortError(err)) {
          console.error("Error fetching actors from Bluesky:", err);
          setActors([]);
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }, DEBOUNCE_MS);

    return () => {
      controller.abort();
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [value]);

  const handleSelect = (actor: Actor) => {
    onChange(actor.handle);
    setOpen(false);
    setActors([]);
    onSelect(actor);
  };

  const handleInputChange = (newValue: string) => {
    onChange(newValue);
    setOpen(newValue.trim().length > 0);
  };

  const showDropdown = open && value.trim().length > 0;

  return (
    <Popover.Root open={showDropdown} onOpenChange={setOpen}>
      <Command shouldFilter={false} className="w-full">
        <Popover.Anchor asChild>
          <div className="relative">
            <Command.Input
              id={id}
              name={name}
              value={value}
              onValueChange={handleInputChange}
              onFocus={() => value.trim() && setOpen(true)}
              onBlur={() => {
                setTimeout(() => setOpen(false), 150);
              }}
              placeholder={placeholder}
              disabled={disabled}
              autoComplete="off"
              required
              className={"ui-input"}
            />
            {loading && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <Spinner size={16} />
              </div>
            )}
          </div>
        </Popover.Anchor>
        <Popover.Portal>
          <Popover.Content
            className="z-50 w-(--radix-popover-trigger-width) mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto"
            align="start"
            sideOffset={4}
            onOpenAutoFocus={(event: Event) => event.preventDefault()}
          >
            <ActorList
              loading={loading}
              actors={actors}
              handleSelect={handleSelect}
            />
          </Popover.Content>
        </Popover.Portal>
      </Command>
    </Popover.Root>
  );
}
