import { useState, useEffect, useRef } from "react";
import { MapPin } from "lucide-react";
import { searchLocations, type NominatimResult } from "@/utils/nominatim";
import { latLonToH3 } from "@/utils/h3";

export interface LocationData {
  name: string;
  lat: number;
  lon: number;
  h3Index: string;
}

interface LocationInputProps {
  value: LocationData | null;
  onChange: (location: LocationData | null) => void;
  placeholder?: string;
}

export function LocationInput({ value, onChange, placeholder }: LocationInputProps) {
  const [inputValue, setInputValue] = useState(value?.name || "");
  const [suggestions, setSuggestions] = useState<NominatimResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const focusControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    // Close dropdown on outside click.
    function handleClickOutside(event: PointerEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("pointerdown", handleClickOutside);
    return () => document.removeEventListener("pointerdown", handleClickOutside);
  }, []);

  useEffect(() => {
    // Abort pending focus lookup on unmount.
    return () => {
      focusControllerRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    // Debounced search on user input.
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    if (!hasInteracted) {
      return;
    }

    if (inputValue.trim().length < 2) {
      setSuggestions([]);
      setShowDropdown(false);
      setIsLoading(false);
      return;
    }

    const controller = new AbortController();
    debounceTimer.current = setTimeout(async () => {
      setIsLoading(true);
      const results = await searchLocations(inputValue, controller.signal);
      if (!controller.signal.aborted) {
        setSuggestions(results);
        setShowDropdown(results.length > 0);
        setIsLoading(false);
      }
    }, 300);

    return () => {
      controller.abort();
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [inputValue, hasInteracted]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setHasInteracted(true);
    setInputValue(e.target.value);
    if (!e.target.value.trim()) {
      onChange(null);
    }
  };

  const handleFocus = async () => {
    setHasInteracted(true);
    if (inputValue.trim().length >= 2) {
      focusControllerRef.current?.abort();
      const controller = new AbortController();
      focusControllerRef.current = controller;
      setIsLoading(true);
      const results = await searchLocations(inputValue, controller.signal);
      if (!controller.signal.aborted) {
        setSuggestions(results);
        setShowDropdown(results.length > 0);
        setIsLoading(false);
      }
    }
  };

  const formatLocationName = (result: NominatimResult): string => {
    const parts: string[] = [];
    if (result.address?.city) parts.push(result.address.city);
    if (result.address?.state) parts.push(result.address.state);
    if (result.address?.country) parts.push(result.address.country);
    return parts.length > 0 ? parts.join(", ") : result.display_name;
  };

  const handleSelectLocation = (result: NominatimResult) => {
    const lat = parseFloat(result.lat);
    const lon = parseFloat(result.lon);
    const h3Index = latLonToH3(lat, lon);
    const formattedName = formatLocationName(result);

    const location: LocationData = {
      name: formattedName,
      lat,
      lon,
      h3Index,
    };

    setInputValue(formattedName);
    onChange(location);
    setShowDropdown(false);
    setSuggestions([]);
  };

  return (
    <div className="relative" ref={wrapperRef}>
      <div className="relative">
        <input
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onFocus={handleFocus}
          placeholder={placeholder || "Search for a location..."}
          className="ui-input pr-10"
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
          {isLoading ? (
            <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
          ) : (
            <MapPin size={16} />
          )}
        </div>
      </div>

      {showDropdown && suggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {suggestions.map((result) => (
            <button
              key={result.place_id}
              type="button"
              onClick={() => handleSelectLocation(result)}
              className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0"
            >
              <div className="flex items-start gap-2">
                <MapPin size={14} className="text-gray-400 mt-1 flex-shrink-0" />
                <div className="text-sm text-gray-700">{formatLocationName(result)}</div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
