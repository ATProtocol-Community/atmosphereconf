export const reducedMotionQuery = matchMedia(
	"(prefers-reduced-motion: reduce)",
);

export const prefersReducedMotion = (): boolean => reducedMotionQuery.matches;

export const onEnterViewport = (
	el: Element,
	cb: (el: Element) => void,
	{
		once = true,
		rootMargin = "0px 0px -15% 0px",
		threshold = 0.25,
	}: { once?: boolean; rootMargin?: string; threshold?: number } = {},
): (() => void) => {
	const observer = new IntersectionObserver(
		(entries) => {
			for (const entry of entries) {
				if (!entry.isIntersecting) continue;
				cb(entry.target);
				if (once) observer.disconnect();
			}
		},
		{ rootMargin, threshold },
	);
	observer.observe(el);
	return () => observer.disconnect();
};

export const playWhileVisible = (
	el: HTMLElement,
	{ rootMargin = "100px" }: { rootMargin?: string } = {},
): (() => void) => {
	let intersecting = false;
	const sync = () => {
		el.toggleAttribute("data-playing", intersecting && !document.hidden);
	};
	const observer = new IntersectionObserver(
		(entries) => {
			const latest = entries[entries.length - 1];
			if (!latest) return;
			intersecting = latest.isIntersecting;
			sync();
		},
		{ rootMargin },
	);
	observer.observe(el);
	document.addEventListener("visibilitychange", sync);
	return () => {
		observer.disconnect();
		document.removeEventListener("visibilitychange", sync);
		el.removeAttribute("data-playing");
	};
};

export const whenHeroReady = (timeoutMs = 2600): Promise<void> =>
	new Promise((resolve) => {
		const hero = document.querySelector<HTMLElement>("[data-hero]");
		if (hero?.dataset.heroReady !== undefined) {
			resolve();
			return;
		}
		let timer = 0;
		const finish = () => {
			document.removeEventListener("hero:ready", finish);
			clearTimeout(timer);
			resolve();
		};
		document.addEventListener("hero:ready", finish, { once: true });
		timer = window.setTimeout(finish, timeoutMs);
	});
