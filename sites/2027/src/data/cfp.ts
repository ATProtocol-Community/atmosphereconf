// Call for presentations facts shared by the CFP page sections.
export const cfp = {
	submissionUrl: "https://cfp.atmosphereconf.org/atmoco2027/cfp",
	contactEmail: "speakers@atmosphereconf.org",
	// 2027 has no Code of Conduct page yet, so point at last year's.
	codeOfConductUrl: "https://2026.atmosphereconf.org/faqs#code-of-conduct",
	deadline: new Date("2026-11-30T23:59:00+01:00"),
	deadlineLabel: "2026-11-30 23:59",
	timeZone: "Europe/Amsterdam",
	rounds: [
		{
			name: "Round 1",
			dates: "15 Oct — 30 Nov 2026",
			reply: "You’ll hear from us by 18 December.",
		},
		{
			name: "Round 2",
			dates: "11 Jan — 14 Feb 2027",
			reply: "You’ll hear from us by 5 March.\nRound 2 has fewer slots.",
		},
	],
};

/**
 * "1 month, 3 weeks from now" style countdown, coarse on purpose: the page is
 * rendered per request, so a day-level number would look wrong by evening.
 */
export function timeUntil(target: Date, now = new Date()): string {
	const days = Math.floor((target.getTime() - now.getTime()) / 86_400_000);
	if (days < 0) return "Submissions have closed.";
	if (days === 0) return "Closes today.";
	if (days < 7) return `${plural(days, "day")} to go.`;
	const months = Math.floor(days / 30);
	const weeks = Math.floor((days % 30) / 7);
	const parts = [];
	if (months) parts.push(plural(months, "month"));
	if (weeks) parts.push(plural(weeks, "week"));
	return `${parts.join(", ")} to go.`;
}

function plural(count: number, unit: string) {
	return `${count} ${unit}${count === 1 ? "" : "s"}`;
}
