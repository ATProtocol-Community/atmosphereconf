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
			gEl?: Element | null;
			shoeEl?: Element | null;
		}
	>;
	const BODY_PIVOT = [400, 360];
	const SHOULDER = [290, 317.5];
	const HAND_SWING = 26;
	const TAIL_PIVOT = [604, 420];

	// Gait parameters
	const WALK = {
		PERIOD: 1.1,
		LEAN: 0,
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

	// Kimbia theme: short stance, high knees, forward lean
	const RUN = {
		...WALK,
		PERIOD: 0.5,
		LEAN: -9,
		STANCE: 0.4,
		A: 24,
		H: 34,
		HEEL_UP: 18,
		BOB: 7,
		JOLT: 4,
		SWAY: 3,
		ROLL: 3,
	};

	let P = WALK;
	const gaitFor = () =>
		document.body.dataset.palette === "kimbia" ? RUN : WALK;

	// Googly eye physics for Fujocoded theme
	const EYE = {
		GRAVITY: 1400,
		ACCEL_GAIN: 5,
		DAMPING: 1.6,
		RESTITUTION: 0.35,
		RIM_FRICTION: 0.92,
		SVG_ROTATE_DEG: 10,
	};

	// Raccoon tail for Fujocoded theme
	const TAIL = {
		STIFFNESS: 40,
		DAMPING: 5,
		ROLL_FOLLOW: -2.5,
		JOLT_KICK: -3.5,
		MAX_DEG: 12,
	};

	// Easing helpers
	const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
	const easeInOutSine = (t: number) => 0.5 - 0.5 * Math.cos(Math.PI * t);
	const easeInQuad = (t: number) => t * t;
	const rad = (d: number) => (d * Math.PI) / 180;

	function legPose(p: number, gait: typeof WALK) {
		if (p < gait.STANCE) {
			const s = p / gait.STANCE;
			const theta = gait.A * (1 - 2 * s);

			let phi;

			if (s < gait.SLAP) {
				phi = gait.TOE_UP * (1 - easeInQuad(s / gait.SLAP));
			} else if (s < 0.72) {
				phi = 0;
			} else {
				phi = -gait.HEEL_UP * easeInQuad((s - 0.72) / 0.28);
			}

			return { theta, phi, lift: 0 };
		}

		const s = (p - gait.STANCE) / (1 - gait.STANCE);
		const theta = lerp(-gait.A, gait.A, easeInOutSine(s));
		const lift = gait.H * Math.sin(Math.PI * s);
		const phi =
			s < 0.45
				? lerp(-gait.HEEL_UP, -gait.DANGLE, easeInOutSine(s / 0.45))
				: lerp(
						-gait.DANGLE,
						gait.TOE_UP,
						easeInOutSine((s - 0.45) / 0.55),
					);

		return { theta, phi, lift };
	}

	function bodyToWorld(
		x: number,
		y: number,
		sway: number,
		dy: number,
		rollDeg: number,
	): [number, number] {
		const c = Math.cos(rad(rollDeg));
		const s = Math.sin(rad(rollDeg));
		const px = x - BODY_PIVOT[0];
		const py = y - BODY_PIVOT[1];
		return [
			BODY_PIVOT[0] + px * c - py * s + sway,
			BODY_PIVOT[1] + px * s + py * c + dy,
		];
	}

	type Eye = {
		pupil: Element;
		cx: number;
		cy: number;
		limit: number;
		px: number;
		py: number;
		vx: number;
		vy: number;
		prevWorld: [number, number] | null;
		prevVel: [number, number] | null;
	};

	type GooseState = {
		bodyEl: Element;
		tailEl: Element | null;
		armEl: Element | null;
		legs: (typeof LEGS)[string][];
		eyes: Eye[];
		t: number;
		last: number | null;
		tailAngle: number;
		tailVel: number;
		prevBodyDy: number | null;
	};

	const roots = Array.from(
		document.querySelectorAll<SVGSVGElement>("#goose-svg"),
	);
	const gooseStates: GooseState[] = roots.map((root, index) => {
		const find = (selector: string) => root.querySelector(selector);
		const legs = Object.values(LEGS).map((leg) => ({
			...leg,
			gEl: find(`#${leg.g}`),
			shoeEl: find(`#${leg.shoe}`),
		}));
		const eyes = Array.from(root.querySelectorAll<HTMLElement>(".eye")).map(
			(el) => {
				const r = Number(el.dataset.r);
				const pr = Number(el.dataset.pupil);
				return {
					pupil: el.querySelector("circle:last-of-type")!,
					cx: Number(el.dataset.cx),
					cy: Number(el.dataset.cy),
					limit: r - pr - 1,
					px: 0,
					py: 0,
					vx: 0,
					vy: 0,
					prevWorld: null,
					prevVel: null,
				};
			},
		);

		return {
			bodyEl: find("#body")!,
			tailEl: find("#tail"),
			armEl: find("#armK"),
			legs,
			eyes,
			t: (0.3 + index * 0.12) % 1,
			last: null,
			tailAngle: 0,
			tailVel: 0,
			prevBodyDy: null,
		};
	});

	// Animation loop
	let running = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;

	function frame(now: number) {
		P = gaitFor();
		for (const goose of gooseStates) {
			if (goose.last === null) goose.last = now;
			const dt = Math.min(0.05, (now - goose.last) / 1000);
			goose.last = now;
			if (running) goose.t = (goose.t + dt / P.PERIOD) % 1;

			const t = goose.t;
			const bob = (P.BOB * (1 - Math.cos(4 * Math.PI * (t - 0.3)))) / 2;
			const u = t % 0.5;
			const jolt = u < 0.1 ? P.JOLT * Math.sin((Math.PI * u) / 0.1) : 0;
			const sway = P.SWAY * Math.sin(2 * Math.PI * t);
			const roll = P.LEAN + P.ROLL * Math.sin(2 * Math.PI * t + 0.4);
			const bodyDy = bob + jolt;

			goose.bodyEl.setAttribute(
				"transform",
				`translate(${sway.toFixed(2)} ${bodyDy.toFixed(2)}) rotate(${roll.toFixed(2)} ${BODY_PIVOT[0]} ${BODY_PIVOT[1]})`,
			);
			goose.armEl?.setAttribute(
				"transform",
				`rotate(${(HAND_SWING * Math.sin(2 * Math.PI * t)).toFixed(2)} ${SHOULDER[0]} ${SHOULDER[1]})`,
			);

			for (const leg of goose.legs) {
				const { theta, phi, lift } = legPose((t + leg.phase) % 1, P);
				const [hx, hy] = leg.hip;
				const [ax, ay] = leg.ankle;
				leg.gEl?.setAttribute(
					"transform",
					`translate(0 ${(bob - lift).toFixed(2)}) rotate(${theta.toFixed(2)} ${hx} ${hy})`,
				);
				leg.shoeEl?.setAttribute(
					"transform",
					`rotate(${(phi - theta).toFixed(2)} ${ax} ${ay})`,
				);
			}

			if (running && dt > 0) {
				const tilt = rad(EYE.SVG_ROTATE_DEG + roll);
				const gx = Math.sin(tilt) * EYE.GRAVITY;
				const gy = Math.cos(tilt) * EYE.GRAVITY;

				for (const eye of goose.eyes) {
					const world = bodyToWorld(eye.cx, eye.cy, sway, bodyDy, roll);
					let ax = 0;
					let ay = 0;
					if (eye.prevWorld) {
						const vel: [number, number] = [
							(world[0] - eye.prevWorld[0]) / dt,
							(world[1] - eye.prevWorld[1]) / dt,
						];
						if (eye.prevVel) {
							ax = (vel[0] - eye.prevVel[0]) / dt;
							ay = (vel[1] - eye.prevVel[1]) / dt;
						}
						eye.prevVel = vel;
					}
					eye.prevWorld = world;

					eye.vx += (gx - ax * EYE.ACCEL_GAIN) * dt;
					eye.vy += (gy - ay * EYE.ACCEL_GAIN) * dt;
					const drag = Math.exp(-EYE.DAMPING * dt);
					eye.vx *= drag;
					eye.vy *= drag;
					eye.px += eye.vx * dt;
					eye.py += eye.vy * dt;

					const d = Math.hypot(eye.px, eye.py);
					if (d > eye.limit) {
						const nx = eye.px / d;
						const ny = eye.py / d;
						eye.px = nx * eye.limit;
						eye.py = ny * eye.limit;
						const vn = eye.vx * nx + eye.vy * ny;
						if (vn > 0) {
							const tx = eye.vx - vn * nx;
							const ty = eye.vy - vn * ny;
							eye.vx =
								tx * EYE.RIM_FRICTION - vn * EYE.RESTITUTION * nx;
							eye.vy =
								ty * EYE.RIM_FRICTION - vn * EYE.RESTITUTION * ny;
						}
					}

					eye.pupil.setAttribute(
						"transform",
						`translate(${eye.px.toFixed(2)} ${eye.py.toFixed(2)})`,
					);
				}

				const bodyVy =
					goose.prevBodyDy === null
						? 0
						: (bodyDy - goose.prevBodyDy) / dt;
				goose.prevBodyDy = bodyDy;
				const target = roll * TAIL.ROLL_FOLLOW;
				goose.tailVel +=
					(TAIL.STIFFNESS * (target - goose.tailAngle) -
						TAIL.DAMPING * goose.tailVel) *
					dt;
				goose.tailVel += TAIL.JOLT_KICK * bodyVy * dt;
				goose.tailAngle += goose.tailVel * dt;
				goose.tailAngle = Math.max(
					-TAIL.MAX_DEG,
					Math.min(TAIL.MAX_DEG, goose.tailAngle),
				);
				goose.tailEl?.setAttribute(
					"transform",
					`rotate(${goose.tailAngle.toFixed(2)} ${TAIL_PIVOT[0]} ${TAIL_PIVOT[1]})`,
				);
			}
		}

		requestAnimationFrame(frame);
	}

	requestAnimationFrame(frame);
};

gooseAnim();
