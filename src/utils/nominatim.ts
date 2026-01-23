export interface NominatimResult {
  display_name: string;
  lat: string;
  lon: string;
  type: string;
  place_id: number;
  address?: {
    city?: string;
    state?: string;
    country?: string;
  };
}

export async function searchLocations(query: string): Promise<NominatimResult[]> {
  if (!query || query.trim().length < 2) {
    return [];
  }

  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("format", "json");
  url.searchParams.set("q", query.trim());
  url.searchParams.set("limit", "5");
  url.searchParams.set("addressdetails", "1");

  try {
    const response = await fetch(url.toString(), {
      headers: {
        "User-Agent": "atmosphere-conf-app/1.0",
      },
    });

    if (!response.ok) {
      throw new Error(`Nominatim API error: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error fetching locations from Nominatim:", error);
    return [];
  }
}
