const gooseAnim = (root: SVGSVGElement, phase = 0) => {
	const SVG_NS = "http://www.w3.org/2000/svg";
	const bodyPivot: readonly [number, number] = [470, 550];
	const bouquetPivot: readonly [number, number] = [248, 427];
	const frontFootPivot: readonly [number, number] = [343.861, 610.977];
	// Matching shoe contours: undo the rear shoe's authored tilt at its collar.
	const rearFootPivot: readonly [number, number] = [551.418, 590.368];
	const rearFootFlatAngle = 28.43;
	const rearFootGroundOffset = 20.609;
	const walk = {
		period: 1.1, stance: 0.6, stride: 44, lift: 20,
		bob: 2.5, sway: 2, roll: 0.6, lean: 0, toe: 8,
		pivot: bodyPivot,
	};
	const run = {
		period: 0.5, stance: 0.4, stride: 66, lift: 56,
		bob: 7, sway: 3, roll: 3, lean: -9, toe: 18,
		pivot: [400, 360] as const,
	};

	const art = root.querySelector<SVGGElement>("g[clip-path]");
	if (!art) return;

	const parts = Array.from(art.children);
	const ranges = {
		bouquet: [0, 8],
		leftLeg: [8, 11],
		rightLeg: [11, 14],
		body: [14, 19],
	} as const;
	if (parts.length !== ranges.body[1]) return;

	const wrap = (id: string, [start, end]: readonly [number, number]) => {
		const group = document.createElementNS(SVG_NS, "g");
		group.id = id;
		art.insertBefore(group, parts[start]);
		for (const part of parts.slice(start, end)) group.append(part);
		return group;
	};

	const bouquet = wrap("goose-bouquet", ranges.bouquet);
	const leftLeg = wrap("goose-leg-left", ranges.leftLeg);
	const rightLeg = wrap("goose-leg-right", ranges.rightLeg);
	const body = wrap("goose-body", ranges.body);
	// Keep the source illustration intact; theme accessories follow its body.
	const tail = root.querySelector<SVGGElement>("[data-goose-tail]");
	const tailRestTransform = tail?.getAttribute("transform") ?? "";
	if (tail) body.prepend(tail);
	const glasses = root.querySelector<SVGGElement>("[data-goose-glasses]");
	if (glasses) body.append(glasses);
	const runner = root.querySelector<SVGGElement>("[data-goose-runner]");
	const arm = root.querySelector<SVGGElement>("[data-goose-running-arm]");
	if (runner) body.append(runner);
	const motionParts = [bouquet, leftLeg, rightLeg, body];
	const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
	let running = !reducedMotion.matches;
	let scheduled = false;
	let last: number | null = null;
	let t = phase;
	let tailAngle = 0;
	let tailVelocity = 0;
	let previousBob: number | null = null;

	const reset = () => {
		for (const part of motionParts) part.removeAttribute("transform");
		arm?.removeAttribute("transform");
		if (tailRestTransform) tail?.setAttribute("transform", tailRestTransform);
		else tail?.removeAttribute("transform");
		tailAngle = 0;
		tailVelocity = 0;
		previousBob = null;
	};

	const schedule = () => {
		if (scheduled || !running || document.hidden) return;
		scheduled = true;
		if (root.getClientRects().length === 0) {
			window.setTimeout(() => requestAnimationFrame(frame), 250);
		} else {
			requestAnimationFrame(frame);
		}
	};

	const frame = (now: number) => {
		scheduled = false;
		if (!running || document.hidden) return;
		if (root.getClientRects().length === 0) {
			last = null;
			schedule();
			return;
		}

		if (last === null) last = now;
		const dt = Math.min(0.08, (now - last) / 1000);
		last = now;
		const gait = document.body.dataset.palette === "kimbia" ? run : walk;
		t = (t + dt / gait.period) % 1;

		// Settle onto each step, then rise gently over the supporting foot.
		const bob = -gait.bob * (1 - Math.cos(4 * Math.PI * t));
		const sway = gait.sway * Math.sin(2 * Math.PI * t);
		const roll = gait.lean + gait.roll * Math.sin(2 * Math.PI * t);
		const bodyMotion = `translate(${sway.toFixed(2)} ${bob.toFixed(2)}) rotate(${roll.toFixed(2)} ${gait.pivot[0]} ${gait.pivot[1]})`;
		body.setAttribute("transform", bodyMotion);
		// Let the tail lag behind each step without changing its authored placement.
		const bodyVelocity = previousBob === null || dt === 0 ? 0 : (bob - previousBob) / dt;
		previousBob = bob;
		const tailTarget = (roll - gait.lean) * -2.5;
		tailVelocity += (40 * (tailTarget - tailAngle) - 5 * tailVelocity - 3.5 * bodyVelocity) * dt;
		tailAngle = Math.max(-12, Math.min(12, tailAngle + tailVelocity * dt));
		tail?.setAttribute(
			"transform",
			`${tailRestTransform} rotate(${tailAngle.toFixed(2)} 604 420)`,
		);
		arm?.setAttribute(
			"transform",
			`rotate(${(26 * Math.sin(2 * Math.PI * t)).toFixed(2)} 332 319)`,
		);
		bouquet.setAttribute(
			"transform",
			`${bodyMotion} rotate(${(3 * Math.sin(2 * Math.PI * t)).toFixed(2)} ${bouquetPivot[0]} ${bouquetPivot[1]})`,
		);

		// Bring the drawing's wide stance under the belly so the feet can pass.
		for (const [leg, phase, restingX, footPivot] of [
			[leftLeg, 0, 80, frontFootPivot],
			[rightLeg, 0.5, -80, rearFootPivot],
		] as const) {
			const cycle = (t + phase) % 1;
			const planted = cycle < gait.stance;
			const progress = planted
				? cycle / gait.stance
				: (cycle - gait.stance) / (1 - gait.stance);
			const eased = progress * progress * (3 - 2 * progress);
			// A planted shoe stays level as it pushes back; only recovery lifts it.
			const stride = planted
				? -gait.stride + 2 * gait.stride * eased
				: gait.stride - 2 * gait.stride * eased;
			const recovery = planted ? 0 : Math.sin(Math.PI * progress) ** 2;
			const lift = gait.lift * recovery;
			const flatten = leg === rightLeg ? 1 - recovery : 0;
			const angle = leg === rightLeg ? rearFootFlatAngle * flatten : -gait.toe * recovery;
			const vertical = rearFootGroundOffset * flatten - lift;
			leg.setAttribute(
				"transform",
				`translate(${(restingX + stride).toFixed(2)} ${vertical.toFixed(2)}) rotate(${angle.toFixed(2)} ${footPivot[0]} ${footPivot[1]})`,
			);
		}

		schedule();
	};

	reducedMotion.addEventListener("change", (event) => {
		running = !event.matches;
		last = null;
		if (running) schedule();
		else reset();
	});
	document.addEventListener("visibilitychange", () => {
		last = null;
		schedule();
	});

	schedule();
};

document
	.querySelectorAll<SVGSVGElement>(".goose-route #goose-svg")
	.forEach((root, index) => gooseAnim(root, (index * 0.2) % 1));
