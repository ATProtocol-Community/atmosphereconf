export interface StampDefinition {
	id: "delft" | "tulip" | "airmail" | "canal" | "cancelled" | "postcard-stamp";
	name: string;
	year: string;
}

export const stamps: StampDefinition[] = [
	{ id: "postcard-stamp", name: "Postcard stamp", year: "2027" },
	{ id: "delft", name: "Delft portrait", year: "2027" },
	{ id: "tulip", name: "Tulip border", year: "2027" },
	{ id: "airmail", name: "Air mail", year: "NL · 2027" },
	{ id: "canal", name: "Canal oval", year: "2027" },
	{ id: "cancelled", name: "Cancelled", year: "2027" },
];
