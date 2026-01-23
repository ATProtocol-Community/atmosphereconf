import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import {
  Command,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverAnchor,
} from "@/components/ui/popover";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Spinner } from "@/components/ui/spinner";

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
  const inputRef = useRef<HTMLInputElement>(null);
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

    setLoading(true);

    debounceRef.current = setTimeout(async () => {
      try {
        const url = new URL(
          "https://public.api.bsky.app/xrpc/app.bsky.actor.searchActorsTypeahead"
        );
        url.searchParams.set("q", query);
        url.searchParams.set("limit", "5");

        const response = await fetch(url.toString());

        if (!response.ok) {
          setActors([]);
          setLoading(false);
          return;
        }

        const data = await response.json();
        const results: Actor[] = (data.actors || []).map((actor: any) => ({
          did: actor.did || "",
          handle: actor.handle || "",
          displayName: actor.displayName,
          avatar: actor.avatar,
        }));

        setActors(results);
      } catch {
        // Silent fail - just clear results
        setActors([]);
      } finally {
        setLoading(false);
      }
    }, DEBOUNCE_MS);

    return () => {
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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange(newValue);
    setOpen(newValue.trim().length > 0);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Let Command handle arrow keys and enter when open
    if (open && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
      e.preventDefault();
    }
  };

  const showDropdown = open && (actors.length > 0 || loading);

  return (
    <Popover open={showDropdown} onOpenChange={setOpen}>
      <PopoverAnchor asChild>
        <div className="relative">
          <input
            ref={inputRef}
            type="text"
            id={id}
            name={name}
            value={value}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onFocus={() => value.trim() && setOpen(true)}
            onBlur={() => {
              // Delay close to allow click on dropdown items
              setTimeout(() => setOpen(false), 150);
            }}
            placeholder={placeholder}
            disabled={disabled}
            autoComplete="off"
            required
            className={cn(
              "file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
              "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
            )}
          />
          {loading && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <Spinner size={16} />
            </div>
          )}
        </div>
      </PopoverAnchor>
      <PopoverContent
        className="w-[var(--radix-popover-trigger-width)] p-0"
        align="start"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <Command>
          <CommandList>
            {loading && actors.length === 0 ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                Searching...
              </div>
            ) : actors.length === 0 ? (
              <CommandEmpty>No users found.</CommandEmpty>
            ) : (
              <CommandGroup>
                {actors.map((actor) => (
                  <CommandItem
                    key={actor.did}
                    value={actor.handle}
                    onSelect={() => handleSelect(actor)}
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <Avatar className="h-8 w-8">
                      {actor.avatar && <AvatarImage src={actor.avatar} />}
                      <AvatarFallback>
                        {(actor.displayName || actor.handle)
                          .charAt(0)
                          .toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col min-w-0">
                      {actor.displayName && (
                        <span className="text-sm font-medium truncate">
                          {actor.displayName}
                        </span>
                      )}
                      <span className="text-xs text-muted-foreground truncate">
                        @{actor.handle}
                      </span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
