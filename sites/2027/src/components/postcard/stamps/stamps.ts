type StampDesign = "delft" | "airmail" | "canal" | "cancelled" | "postcard-stamp";

export interface StampDefinition {
	id: StampDesign;
	name: string;
	year: string;
	character?: "goose";
}

export const stamps: StampDefinition[] = [
	{ id: "postcard-stamp", name: "Postcard stamp", year: "2026" },
	{ id: "delft", name: "Delft portrait", year: "2026" },
	{ id: "airmail", name: "Air mail", year: "2026" },
	{ id: "canal", name: "Canal oval", year: "2026" },
	{ id: "cancelled", name: "Cancelled", year: "2026" },
	{ id: "postcard-stamp", name: "Goose postcard", year: "2025", character: "goose" },
	{ id: "delft", name: "Goose in Delft blue", year: "2025", character: "goose" },
	{ id: "airmail", name: "Goose air mail", year: "2025", character: "goose" },
	{ id: "canal", name: "Goose cameo", year: "2025", character: "goose" },
	{ id: "cancelled", name: "Goose postmarked", year: "2025", character: "goose" },
];
