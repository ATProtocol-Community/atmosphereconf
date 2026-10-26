const headings = document.querySelectorAll<HTMLHeadingElement>("h1, h2, h3");
const generatedIds = new Set<string>();

for (const heading of headings) {
	const label =
		heading.getAttribute("aria-label") ||
		heading.innerText.replace(/\s+/g, " ").trim() ||
		heading.querySelector<HTMLImageElement>("img[alt]")?.alt.trim();
	if (!label || heading.querySelector("a")) continue;
	heading.setAttribute("aria-label", label);

	if (!heading.id) {
		const base =
			label
				.normalize("NFKD")
				.toLowerCase()
				.replace(/[\u0300-\u036f]/g, "")
				.replace(/[^a-z0-9]+/g, "-")
				.replace(/^-|-$/g, "") || "heading";
		let id = base;
		let suffix = 2;
		while (document.getElementById(id)) id = `${base}-${suffix++}`;
		heading.id = id;
		generatedIds.add(id);
	}

	if (getComputedStyle(heading).position === "static") {
		heading.style.position = "relative";
	}

	const link = document.createElement("a");
	link.className = "heading-anchor";
	link.href = `#${encodeURIComponent(heading.id)}`;
	link.setAttribute("aria-label", `Link to ${label}`);
	heading.append(link);
}

const initialHash = location.hash.slice(1);
if (generatedIds.has(initialHash)) {
	requestAnimationFrame(() =>
		document.getElementById(initialHash)?.scrollIntoView(),
	);
}
