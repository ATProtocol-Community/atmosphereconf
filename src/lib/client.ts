export function login(handle: string): void {
  const params = new URLSearchParams({ handle });
  // TODO: switch these to server redirects once it's moved to Astro actions
  window.location.href = `/api/auth/login?${params}`;
}

export async function logout(): Promise<void> {
  await fetch("/api/auth/logout", { method: "POST" });
  // TODO: switch these to server redirects once it's moved to Astro actions
  window.location.href = "/";
}

export async function query<T>(
  queryString: string,
  variables?: Record<string, unknown>,
): Promise<T> {
  const res = await fetch("/api/graphql", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query: queryString, variables }),
  });

  if (!res.ok) {
    throw new Error(`GraphQL request failed: ${res.status}`);
  }

  const json = await res.json();
  if (json.errors?.length) {
    throw new Error(json.errors[0].message);
  }
  return json.data;
}

export async function mutate<T>(
  mutationString: string,
  variables?: Record<string, unknown>,
): Promise<T> {
  return query<T>(mutationString, variables);
}
