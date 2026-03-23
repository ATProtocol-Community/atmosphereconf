const STORAGE_KEY = "atmosphere:starred";

function getStarred(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch {
    return new Set();
  }
}

function saveStarred(ids: Set<string>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...ids]));
  } catch {}
}

export function toggleStarred(id: string): boolean {
  const starred = getStarred();
  const wasStarred = starred.has(id);
  if (wasStarred) {
    starred.delete(id);
  } else {
    starred.add(id);
  }
  saveStarred(starred);
  const nowStarred = !wasStarred;
  window.dispatchEvent(
    new CustomEvent("starred-change", { detail: { id, starred: nowStarred } }),
  );
  return nowStarred;
}

export function applyStarredState(root: Element | Document = document) {
  const starred = getStarred();
  root.querySelectorAll<HTMLElement>("[data-star-btn]").forEach((btn) => {
    const id = btn.dataset.starBtn;
    if (!id) return;
    const active = starred.has(id);
    btn.setAttribute("aria-pressed", String(active));
    btn.classList.toggle("is-starred", active);
  });
}

let handlersInitialized = false;

export function initStarredHandlers() {
  if (handlersInitialized) return;
  handlersInitialized = true;

  document.addEventListener("click", (e) => {
    const btn = (e.target as HTMLElement).closest<HTMLElement>(
      "[data-star-btn]",
    );
    if (!btn) return;
    e.preventDefault();
    e.stopPropagation();
    const id = btn.dataset.starBtn;
    if (!id) return;
    const nowStarred = toggleStarred(id);
    document
      .querySelectorAll<HTMLElement>(`[data-star-btn="${CSS.escape(id)}"]`)
      .forEach((b) => {
        b.setAttribute("aria-pressed", String(nowStarred));
        b.classList.toggle("is-starred", nowStarred);
      });
    if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const icon =
        btn.querySelector<SVGElement>(
          nowStarred ? "svg[class*='filled']" : "svg[class*='empty']",
        ) ?? btn.querySelector<SVGElement>("svg");
      if (icon) {
        icon.animate(
          nowStarred
            ? [
                { transform: "scaleY(1)" },
                { transform: "scaleY(0.12)" },
                { transform: "scaleY(1)" },
              ]
            : [
                { transform: "scaleY(1)" },
                { transform: "scaleY(0.2)" },
                { transform: "scaleY(1)" },
              ],
          { duration: nowStarred ? 320 : 200, easing: "ease" },
        );
      }
    }
  });
}
