const gooseAnim = () => {
	// Rig geometry
	const LEGS = {
		L: {
			g: "legL",
			shoe: "shoeL",
			hip: [346, 530],
			ankle: [338, 610],
			phase: 0.0,
		},
		R: {
			g: "legR",
			shoe: "shoeR",
			hip: [518, 505],
			ankle: [524, 588],
			phase: 0.5,
		},
	} as Record<
		string,
		{
			g: string;
			shoe: string;
			hip: [number, number];
			ankle: [number, number];
			phase: number;
			gEl?: HTMLElement;
			shoeEl?: HTMLElement;
		}
	>;
	const BODY_PIVOT = [400, 360];

	// Gait parameters
	const P = {
		STANCE: 0.6,
		A: 13,
		H: 16,
		TOE_UP: 7,
		SLAP: 0.12,
		HEEL_UP: 10,
		DANGLE: 8,
		BOB: 4,
		JOLT: 2.5,
		SWAY: 5,
		ROLL: 2,
	};

	// Easing helpers
	const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
	const easeInOutSine = (t: number) => 0.5 - 0.5 * Math.cos(Math.PI * t);
	const easeInQuad = (t: number) => t * t;

	function legPose(p: number) {
		if (p < P.STANCE) {
			const s = p / P.STANCE;
			const theta = P.A * (1 - 2 * s);

			let phi;

			if (s < P.SLAP) {
				phi = P.TOE_UP * (1 - easeInQuad(s / P.SLAP));
			} else if (s < 0.72) {
				phi = 0;
			} else {
				phi = -P.HEEL_UP * easeInQuad((s - 0.72) / 0.28);
			}

			return { theta, phi, lift: 0 };
		}

		const s = (p - P.STANCE) / (1 - P.STANCE);
		const theta = lerp(-P.A, P.A, easeInOutSine(s));
		const lift = P.H * Math.sin(Math.PI * s);
		const phi =
			s < 0.45
				? lerp(-P.HEEL_UP, -P.DANGLE, easeInOutSine(s / 0.45))
				: lerp(-P.DANGLE, P.TOE_UP, easeInOutSine((s - 0.45) / 0.55));

		return { theta, phi, lift };
	}

	// DOM
	const $ = <T extends HTMLElement>(id: string) =>
		document.getElementById(id) as T;
	const bodyEl = $("body")!;

	for (const leg of Object.values(LEGS)) {
		leg.gEl = $(leg.g)!;
		leg.shoeEl = $(leg.shoe)!;
	}

	// Animation loop
	let period = 1.1;
	let running = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
	let t = 0.3;
	let last: number | null = null;

	function frame(now: number) {
		if (last === null) last = now;
		const dt = Math.min(0.05, (now - last) / 1000);
		last = now;
		if (running) t = (t + dt / period) % 1;

		const bob = (P.BOB * (1 - Math.cos(4 * Math.PI * (t - 0.3)))) / 2;
		const u = t % 0.5;
		const jolt = u < 0.1 ? P.JOLT * Math.sin((Math.PI * u) / 0.1) : 0;
		const sway = P.SWAY * Math.sin(2 * Math.PI * t);
		const roll = P.ROLL * Math.sin(2 * Math.PI * t + 0.4);

		bodyEl.setAttribute(
			"transform",
			`translate(${sway.toFixed(2)} ${(bob + jolt).toFixed(2)}) rotate(${roll.toFixed(2)} ${BODY_PIVOT[0]} ${BODY_PIVOT[1]})`,
		);

		for (const leg of Object.values(LEGS)) {
			const { theta, phi, lift } = legPose((t + leg.phase) % 1);
			const [hx, hy] = leg.hip,
				[ax, ay] = leg.ankle;

			leg.gEl?.setAttribute(
				"transform",
				`translate(0 ${(bob - lift).toFixed(2)}) rotate(${theta.toFixed(2)} ${hx} ${hy})`,
			);

			leg.shoeEl?.setAttribute(
				"transform",
				`rotate(${(phi - theta).toFixed(2)} ${ax} ${ay})`,
			);
		}

		requestAnimationFrame(frame);
	}

	requestAnimationFrame(frame);
};

gooseAnim();
