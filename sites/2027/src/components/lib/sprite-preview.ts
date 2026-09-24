const spriteCache = new Map<string, string | null>();

export const attachSpritePreview = (
	input: HTMLInputElement,
	isEnabled: () => boolean = () => true,
) => {
	const sprite = document.querySelector<HTMLElement>("#rpg-actor-goose");
	const defaultSprite = sprite?.style.backgroundImage;
	let controller: AbortController | undefined;
	let timer: ReturnType<typeof setTimeout> | undefined;

	const reset = () => {
		controller?.abort();
		controller = undefined;
		if (sprite && defaultSprite) sprite.style.backgroundImage = defaultSprite;
	};
	const lookUpSprite = async () => {
		const handle = input.value.trim().replace(/^@/, "").toLowerCase();
		if (!handle || !sprite || !isEnabled()) return reset();
		const cachedSprite = spriteCache.get(handle);
		if (cachedSprite !== undefined) {
			sprite.style.backgroundImage = cachedSprite ?? defaultSprite ?? "";
			return;
		}
		controller?.abort();
		const nextController = new AbortController();
		controller = nextController;
		try {
			const identityResponse = await fetch(
				`/api/rpg-sprite?handle=${encodeURIComponent(handle)}`,
				{ signal: nextController.signal },
			);
			const { did, pds } = identityResponse.ok
				? await identityResponse.json()
				: {};
			if (!did || !pds) throw new Error("No actor sprite");
			const recordResponse = await fetch(
				`${pds}/xrpc/com.atproto.repo.listRecords?repo=${encodeURIComponent(did)}&collection=actor.rpg.sprite&limit=1`,
				{ signal: nextController.signal },
			);
			const record = recordResponse.ok
				? (await recordResponse.json()).records?.[0]
				: {};
			const cid = record?.value?.spriteSheet?.ref?.$link;
			const spriteUrl = cid
				? `url(${JSON.stringify(`${pds}/xrpc/com.atproto.sync.getBlob?did=${encodeURIComponent(did)}&cid=${encodeURIComponent(cid)}`)})`
				: null;
			if (controller !== nextController) return;
			spriteCache.set(handle, spriteUrl);
			sprite.style.backgroundImage = spriteUrl ?? defaultSprite ?? "";
		} catch (error) {
			if ((error as DOMException).name === "AbortError" || controller !== nextController)
				return;
			spriteCache.set(handle, null);
			reset();
		}
	};
	const refresh = () => {
		clearTimeout(timer);
		if (!isEnabled()) return reset();
		timer = setTimeout(lookUpSprite, 350);
	};

	input.addEventListener("input", refresh);
	return { refresh, reset };
};