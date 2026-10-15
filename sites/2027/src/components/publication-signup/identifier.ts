/**
 * Whether what's typed in the signup form is an email or an Atmosphere
 * handle. Shared by the form (to switch its look as you type) and the
 * server (to pick the path on submit), so the two can't disagree.
 */
export type Method = "email" | "handle";

const didPattern = /^did:[a-z0-9.-]+:/i;
const handleLikePattern = /^[a-z0-9][a-z0-9-]*\.[a-z0-9][a-z0-9.-]*$/i;

/**
 * Only signals that can't change meaning with more typing: a bare dotted
 * word ("bob.smith") looks like a handle until the "@" arrives.
 */
export const sureMethod = (raw: string): Method | null => {
	const value = raw.trim().toLowerCase();
	if (didPattern.test(value) || value.startsWith("@")) return "handle";
	if (value.includes("@")) return "email";
	return null;
};

/** The text decides when it can; otherwise the visitor's pick, then a guess. */
export const methodFor = (raw: string, chosen?: Method | null): Method =>
	sureMethod(raw) ??
	chosen ??
	(handleLikePattern.test(raw.trim()) ? "handle" : "email");
