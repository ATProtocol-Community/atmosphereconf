import { reducedMotionQuery } from "./motion";

const SVG_NS = "http://www.w3.org/2000/svg";
const VIEW_WIDTH = 593;
const VIEW_HEIGHT = 248;
const PLANE_SCALE = 0.55;
const PLANE_HALF_LENGTH = 142 * PLANE_SCALE;
const PLANE_HALF_HEIGHT = 74 * PLANE_SCALE;
const HOME = { x: 420, y: 92 };
const MEAN_ALTITUDE = 125;
const TAIL = { x: -88 * PLANE_SCALE, y: 19 * PLANE_SCALE };
const AIRSPEED = 90;
const ENERGY_EXCHANGE = 66;
const MIN_AIRSPEED = 45;
const RESTORE_RATE = 0.5;
const RESTORE_LIMIT = 40;
const RESTORE_LAG = 0.8;
const CLIMB = [
	{ amplitude: 46, period: 7.9 },
	{ amplitude: -13, period: 3.4 },
];
const LOOP_MIN = 6;
const LOOP_MAX = 10;
const LOOP_LENGTH = 300;
const LOOP_RAMP = 0.22;
const LOOP_FLOAT = 0.35;
const TURN_STEPS = 1024;
const LOOP_STEPS = 240;
const LOOP_EDGE = 4;
const LOOP_CHECKS = 40;
const EXIT_BLEND = 1.6;
const SAMPLE_STEP = 3;
const DASH_LENGTH = 10;
const DASH_PERIOD = 18;
const TRAIL_LIFE = 3;
const SAMPLE_CAPACITY = 512;
const DASH_POOL = 72;
const REBASE_AT = 4096;
const MAX_DT = 0.08;
const TAU = 2 * Math.PI;

const random = (min: number, max: number) => min + Math.random() * (max - min);

const format = (value: number) => value.toFixed(2);

const clamp = (value: number, min: number, max: number) =>
	Math.min(max, Math.max(min, value));

const airspeedAt = (y: number) =>
	Math.sqrt(
		Math.max(
			MIN_AIRSPEED ** 2,
			AIRSPEED ** 2 - ENERGY_EXCHANGE * (MEAN_ALTITUDE - y),
		),
	);

const smoothBlend = (t: number) => {
	const c = clamp(t, 0, 1);
	return c ** 4 * (35 - 84 * c + 70 * c * c - 20 * c ** 3);
};

const smoothBlendRate = (t: number) => {
	const c = clamp(t, 0, 1);
	return 140 * (c * (1 - c)) ** 3;
};

const turnTable = (() => {
	const table = new Float64Array(TURN_STEPS + 1);
	for (let index = 1; index <= TURN_STEPS; index += 1) {
		const progress = (index - 0.5) / TURN_STEPS;
		const ramp = Math.min(1, progress / LOOP_RAMP, (1 - progress) / LOOP_RAMP);
		const rate =
			((1 - Math.cos(Math.PI * ramp)) / 2) *
			(1 + LOOP_FLOAT * Math.cos(TAU * progress));
		table[index] = (table[index - 1] ?? 0) + rate;
	}
	const total = table[TURN_STEPS] ?? 1;
	for (let index = 0; index <= TURN_STEPS; index += 1) {
		table[index] = (TAU * (table[index] ?? 0)) / total;
	}
	return table;
})();

const loopTurned = (progress: number) => {
	const position = clamp(progress, 0, 1) * TURN_STEPS;
	const index = Math.min(TURN_STEPS - 1, Math.floor(position));
	const t = position - index;
	return (turnTable[index] ?? 0) * (1 - t) + (turnTable[index + 1] ?? TAU) * t;
};

const easeIn = (progress: number) =>
	progress < LOOP_RAMP ? progress * (1 - progress / LOOP_RAMP) ** 2 : 0;

const easeOut = (progress: number) => -easeIn(1 - progress);

type Loop = {
	x: number;
	y: number;
	angle: number;
	duration: number;
	entryTurn: number;
	exitTurn: number;
	offsetX: Float64Array;
	offsetY: Float64Array;
};

const loopHeading = (loop: Loop, progress: number) =>
	loop.angle -
	loopTurned(progress) +
	loop.entryTurn * easeIn(progress) +
	loop.exitTurn * easeOut(progress);

const createLoop = (
	x: number,
	y: number,
	angle: number,
	speed: number,
	entryRate: number,
	exitRate: number,
): Loop => {
	const duration = LOOP_LENGTH / speed;
	const loop: Loop = {
		x,
		y,
		angle,
		duration,
		entryTurn: entryRate * duration,
		exitTurn: exitRate * duration,
		offsetX: new Float64Array(LOOP_STEPS + 1),
		offsetY: new Float64Array(LOOP_STEPS + 1),
	};
	const stepLength = LOOP_LENGTH / LOOP_STEPS;
	for (let index = 1; index <= LOOP_STEPS; index += 1) {
		const heading = loopHeading(loop, (index - 0.5) / LOOP_STEPS);
		loop.offsetX[index] =
			(loop.offsetX[index - 1] ?? 0) + Math.cos(heading) * stepLength;
		loop.offsetY[index] =
			(loop.offsetY[index - 1] ?? 0) + Math.sin(heading) * stepLength;
	}
	return loop;
};

const loopPose = (loop: Loop, progress: number) => {
	const position = clamp(progress, 0, 1) * LOOP_STEPS;
	const index = Math.min(LOOP_STEPS - 1, Math.floor(position));
	const t = position - index;
	const offsetX =
		(loop.offsetX[index] ?? 0) * (1 - t) + (loop.offsetX[index + 1] ?? 0) * t;
	const offsetY =
		(loop.offsetY[index] ?? 0) * (1 - t) + (loop.offsetY[index + 1] ?? 0) * t;
	return {
		x: loop.x + offsetX - AIRSPEED * loop.duration * progress,
		y: loop.y + offsetY,
		angle: loopHeading(loop, progress),
	};
};

const layered = (
	layers: readonly { amplitude: number; period: number }[],
	time: number,
) => {
	let offset = 0;
	let velocity = 0;
	let acceleration = 0;
	for (const { amplitude, period } of layers) {
		const omega = TAU / period;
		offset += amplitude * (1 - Math.cos(omega * time));
		velocity += amplitude * omega * Math.sin(omega * time);
		acceleration += amplitude * omega * omega * Math.cos(omega * time);
	}
	return { offset, velocity, acceleration };
};

interface PaperPlaneOptions {
	/** Whether the plane occasionally flies a loop-the-loop. */
	loops?: boolean;
	/** Seconds a trail dash lasts before fading out; shorter means a shorter trail. */
	trailLife?: number;
	/** Seconds into the climb cycle to start from, so the plane begins mid-flight. */
	startTime?: number;
}

export const paperPlane = (
	root: SVGSVGElement,
	{
		loops = true,
		trailLife = TRAIL_LIFE,
		startTime = 0,
	}: PaperPlaneOptions = {},
): void => {
	const plane = root.querySelector<SVGGElement>('[data-part="plane"]');
	const trail = root.querySelector<SVGGElement>('[data-part="trail"]');
	if (!plane || !trail) return;

	const restTransform = plane.getAttribute("transform") ?? "";

	const sampleX = new Float64Array(SAMPLE_CAPACITY);
	const sampleY = new Float64Array(SAMPLE_CAPACITY);
	const sampleS = new Float64Array(SAMPLE_CAPACITY);
	const sampleT = new Float64Array(SAMPLE_CAPACITY);
	let sampleStart = 0;
	let sampleCount = 0;

	const dashes: SVGPathElement[] = [];
	const dashBorn = new Float64Array(DASH_POOL);
	const dashOpacity = new Float64Array(DASH_POOL);
	let oldestDash = 0;
	let nextDash = 0;

	let clock = 0;
	let cruiseTime = startTime;
	let loopTimer = random(LOOP_MIN, LOOP_MAX);
	let loopProgress: number | null = null;
	let loop: Loop | null = null;
	let cruiseAngle = 0;
	let exitTime: number | null = null;
	let exitOffsetY = 0;
	let exitVelocityX = 0;
	let planeX = HOME.x;
	let restoreVelocity = 0;
	let airOffset = 0;
	let headX = HOME.x;
	let headY = HOME.y;
	let headS = 0;
	let scheduled = false;
	let last: number | null = null;

	const ensurePool = () => {
		if (dashes.length > 0) return;
		for (let index = 0; index < DASH_POOL; index += 1) {
			const dash = document.createElementNS(SVG_NS, "path");
			dash.setAttribute("visibility", "hidden");
			trail.append(dash);
			dashes.push(dash);
		}
	};

	const sampleIndex = (offset: number) =>
		(sampleStart + offset) % SAMPLE_CAPACITY;

	const hideDash = (k: number) => {
		const dash = dashes[k % DASH_POOL];
		if (!dash || dashOpacity[k % DASH_POOL] === -1) return;
		dash.setAttribute("visibility", "hidden");
		dash.removeAttribute("d");
		dashOpacity[k % DASH_POOL] = -1;
	};

	const clearTrail = () => {
		for (let k = oldestDash; k < nextDash; k += 1) hideDash(k);
		hideDash(nextDash);
		sampleStart = 0;
		sampleCount = 0;
		oldestDash = 0;
		nextDash = 0;
		headS = 0;
		airOffset = 0;
		trail.removeAttribute("transform");
	};

	const reset = () => {
		clock = 0;
		cruiseTime = startTime;
		loopTimer = random(LOOP_MIN, LOOP_MAX);
		loopProgress = null;
		exitTime = null;
		loop = null;
		cruiseAngle = 0;
		planeX = HOME.x;
		restoreVelocity = 0;
		last = null;
		if (restTransform) plane.setAttribute("transform", restTransform);
		else plane.removeAttribute("transform");
		clearTrail();
	};

	const pushSample = (x: number, y: number, s: number) => {
		if (sampleCount === SAMPLE_CAPACITY) {
			sampleStart = (sampleStart + 1) % SAMPLE_CAPACITY;
			sampleCount -= 1;
		}
		const index = sampleIndex(sampleCount);
		sampleX[index] = x;
		sampleY[index] = y;
		sampleS[index] = s;
		sampleT[index] = clock;
		sampleCount += 1;
	};

	const pointAt = (distance: number, axis: 0 | 1) => {
		if (distance >= headS) return axis === 0 ? headX : headY;
		const lastIndex = sampleIndex(sampleCount - 1);
		const lastS = sampleS[lastIndex] ?? 0;
		if (distance >= lastS) {
			const t = headS === lastS ? 0 : (distance - lastS) / (headS - lastS);
			const from = axis === 0 ? sampleX[lastIndex] : sampleY[lastIndex];
			const to = axis === 0 ? headX : headY;
			return (from ?? to) + (to - (from ?? to)) * t;
		}
		for (let offset = sampleCount - 1; offset > 0; offset -= 1) {
			const a = sampleIndex(offset - 1);
			if ((sampleS[a] ?? 0) > distance) continue;
			const b = sampleIndex(offset);
			const as = sampleS[a] ?? 0;
			const bs = sampleS[b] ?? as;
			const t = bs === as ? 0 : (distance - as) / (bs - as);
			const from = axis === 0 ? sampleX : sampleY;
			const av = from[a] ?? 0;
			const bv = from[b] ?? av;
			return av + (bv - av) * t;
		}
		const first = sampleIndex(0);
		return axis === 0 ? (sampleX[first] ?? headX) : (sampleY[first] ?? headY);
	};

	const dashPath = (from: number, to: number) => {
		let d = `M${format(pointAt(from, 0))} ${format(pointAt(from, 1))}`;
		for (let offset = 0; offset < sampleCount; offset += 1) {
			const index = sampleIndex(offset);
			const s = sampleS[index] ?? 0;
			if (s <= from || s >= to) continue;
			d += `L${format(sampleX[index] ?? 0)} ${format(sampleY[index] ?? 0)}`;
		}
		return `${d}L${format(pointAt(to, 0))} ${format(pointAt(to, 1))}`;
	};

	const drawDash = (k: number, to: number) => {
		const dash = dashes[k % DASH_POOL];
		if (!dash) return;
		dash.setAttribute("d", dashPath(k * DASH_PERIOD, to));
		dash.setAttribute("visibility", "visible");
		if (dashOpacity[k % DASH_POOL] === -1) dashOpacity[k % DASH_POOL] = 2;
	};

	const rebase = () => {
		for (let offset = 0; offset < sampleCount; offset += 1) {
			const index = sampleIndex(offset);
			sampleX[index] = (sampleX[index] ?? 0) - airOffset;
		}
		headX -= airOffset;
		airOffset = 0;
		for (let k = oldestDash; k < nextDash; k += 1) {
			drawDash(k, k * DASH_PERIOD + DASH_LENGTH);
		}
	};

	const updateTrail = (x: number, y: number, angle: number) => {
		const cos = Math.cos(angle);
		const sin = Math.sin(angle);
		headX = x + TAIL.x * cos - TAIL.y * sin + airOffset;
		headY = y + TAIL.x * sin + TAIL.y * cos;

		if (sampleCount === 0) {
			headS = 0;
			pushSample(headX, headY, 0);
		} else {
			const lastIndex = sampleIndex(sampleCount - 1);
			const gap = Math.hypot(
				headX - (sampleX[lastIndex] ?? headX),
				headY - (sampleY[lastIndex] ?? headY),
			);
			headS = (sampleS[lastIndex] ?? 0) + gap;
			if (gap >= SAMPLE_STEP) pushSample(headX, headY, headS);
		}

		while (nextDash * DASH_PERIOD + DASH_LENGTH <= headS) {
			if (nextDash - oldestDash >= DASH_POOL - 1) {
				hideDash(oldestDash);
				oldestDash += 1;
			}
			drawDash(nextDash, nextDash * DASH_PERIOD + DASH_LENGTH);
			dashBorn[nextDash % DASH_POOL] = clock;
			nextDash += 1;
		}

		while (
			oldestDash < nextDash &&
			clock - (dashBorn[oldestDash % DASH_POOL] ?? 0) >= trailLife
		) {
			hideDash(oldestDash);
			oldestDash += 1;
		}

		while (
			sampleCount > 2 &&
			(sampleS[sampleIndex(1)] ?? 0) < oldestDash * DASH_PERIOD - SAMPLE_STEP
		) {
			sampleStart = (sampleStart + 1) % SAMPLE_CAPACITY;
			sampleCount -= 1;
		}

		const growing = headS - nextDash * DASH_PERIOD;
		if (growing > 0.5 && growing < DASH_LENGTH) {
			if (nextDash - oldestDash >= DASH_POOL - 1) {
				hideDash(oldestDash);
				oldestDash += 1;
			}
			drawDash(nextDash, headS);
			const slot = nextDash % DASH_POOL;
			if (dashOpacity[slot] !== 1) {
				dashes[slot]?.setAttribute("stroke-opacity", "1");
				dashOpacity[slot] = 1;
			}
		} else {
			hideDash(nextDash);
		}

		for (let k = oldestDash; k < nextDash; k += 1) {
			const slot = k % DASH_POOL;
			const life = 1 - (clock - (dashBorn[slot] ?? 0)) / trailLife;
			const opacity = Math.round(Math.max(0, life) ** 1.4 * 1000) / 1000;
			if (opacity !== dashOpacity[slot]) {
				dashes[slot]?.setAttribute("stroke-opacity", String(opacity));
				dashOpacity[slot] = opacity;
			}
		}

		trail.setAttribute("transform", `translate(${format(-airOffset)} 0)`);
	};

	const loopFits = (candidate: Loop) => {
		for (let index = 0; index <= LOOP_CHECKS; index += 1) {
			const pose = loopPose(candidate, index / LOOP_CHECKS);
			const cos = Math.abs(Math.cos(pose.angle));
			const sin = Math.abs(Math.sin(pose.angle));
			const reachX = PLANE_HALF_LENGTH * cos + PLANE_HALF_HEIGHT * sin;
			const reachY = PLANE_HALF_LENGTH * sin + PLANE_HALF_HEIGHT * cos;
			if (
				pose.x - reachX < LOOP_EDGE ||
				pose.x + reachX > VIEW_WIDTH - LOOP_EDGE ||
				pose.y - reachY < LOOP_EDGE ||
				pose.y + reachY > VIEW_HEIGHT - LOOP_EDGE
			) {
				return false;
			}
		}
		return true;
	};

	const cruise = (dt: number) => {
		cruiseTime += dt;
		const climb = layered(CLIMB, cruiseTime);
		let blend = 1;
		let blendRate = 0;
		if (exitTime !== null) {
			exitTime += dt;
			const phase = clamp(exitTime / EXIT_BLEND, 0, 1);
			blend = smoothBlend(phase);
			blendRate = smoothBlendRate(phase) / EXIT_BLEND;
			if (phase >= 1) exitTime = null;
		}
		const y = HOME.y + climb.offset + exitOffsetY * (1 - blend);
		const climbVelocity = climb.velocity - exitOffsetY * blendRate;
		const restoreTarget = clamp(
			RESTORE_RATE * (HOME.x - planeX),
			-RESTORE_LIMIT,
			RESTORE_LIMIT,
		);
		restoreVelocity +=
			(restoreTarget - restoreVelocity) * (1 - Math.exp(-dt / RESTORE_LAG));
		const cruiseVelocity = airspeedAt(y) - AIRSPEED + restoreVelocity;
		const groundVelocity = exitVelocityX * (1 - blend) + cruiseVelocity * blend;
		planeX += groundVelocity * dt;
		const forward = AIRSPEED + groundVelocity;
		const angle = Math.atan2(climbVelocity, forward);
		const turnRate = (angle - cruiseAngle) / dt;
		cruiseAngle = angle;
		if (loops && loopTimer <= 0 && exitTime === null) {
			const speed = Math.hypot(forward, climbVelocity);
			const exitRate = (forward * climb.acceleration) / (speed * speed);
			const candidate = createLoop(planeX, y, angle, speed, turnRate, exitRate);
			if (loopFits(candidate)) {
				loop = candidate;
				loopProgress = 0;
				loopTimer = random(LOOP_MIN, LOOP_MAX);
				exitOffsetY = 0;
				exitVelocityX = groundVelocity;
			}
		}
		return { x: planeX, y, angle };
	};

	const fly = (dt: number) => {
		if (loopProgress === null || !loop) return cruise(dt);
		const progress = loopProgress + dt / loop.duration;
		if (progress < 1) {
			loopProgress = progress;
			return loopPose(loop, progress);
		}
		const exit = loopPose(loop, 1);
		const remaining = (progress - 1) * loop.duration;
		loopProgress = null;
		planeX = exit.x;
		exitTime = 0;
		exitOffsetY = exit.y - loop.y;
		cruiseAngle = loop.angle;
		loop = null;
		return remaining > 0 ? cruise(remaining) : exit;
	};

	const step = (dt: number) => {
		clock += dt;
		loopTimer -= dt;
		const { x, y, angle } = fly(dt);

		airOffset += AIRSPEED * dt;
		if (airOffset > REBASE_AT) rebase();

		plane.setAttribute(
			"transform",
			`translate(${format(x)} ${format(y)}) rotate(${format((angle * 180) / Math.PI)}) scale(${PLANE_SCALE})`,
		);
		updateTrail(x, y, angle);
	};

	const active = () =>
		!reducedMotionQuery.matches &&
		!document.hidden &&
		root.hasAttribute("data-playing");

	const frame = (now: number) => {
		scheduled = false;
		if (reducedMotionQuery.matches) {
			reset();
			return;
		}
		if (!active()) {
			last = null;
			return;
		}
		if (last === null) last = now;
		const dt = Math.min(MAX_DT, (now - last) / 1000);
		last = now;
		if (dt > 0) step(dt);
		schedule();
	};

	const schedule = () => {
		if (scheduled || !active()) return;
		ensurePool();
		scheduled = true;
		requestAnimationFrame(frame);
	};

	const resume = () => {
		last = null;
		schedule();
	};

	reducedMotionQuery.addEventListener("change", (event) => {
		reset();
		if (!event.matches) schedule();
	});
	document.addEventListener("visibilitychange", resume);
	new MutationObserver(resume).observe(root, {
		attributes: true,
		attributeFilter: ["data-playing"],
	});

	if (reducedMotionQuery.matches) return;
	if (startTime > 0) {
		// Jump to the starting pose now so the plane doesn't snap there on the first frame.
		const climb = layered(CLIMB, startTime);
		cruiseAngle = Math.atan2(climb.velocity, AIRSPEED);
		plane.setAttribute(
			"transform",
			`translate(${format(HOME.x)} ${format(HOME.y + climb.offset)}) rotate(${format((cruiseAngle * 180) / Math.PI)}) scale(${PLANE_SCALE})`,
		);
	}
	schedule();
};
