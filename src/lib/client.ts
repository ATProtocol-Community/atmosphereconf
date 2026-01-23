import { createQuicksliceClient, type QuicksliceClient } from "quickslice-client-js";

// Auth configuration
const AUTH_CONFIG = {
  SERVER_URL: "https://orgatmosphereconf.slices.network",
  CLIENT_ID: "client_c7Do__92MpKKMx8qy2Rl7A",
};

let clientInstance: QuicksliceClient | null = null;

export async function getClient(): Promise<QuicksliceClient> {
  if (clientInstance) {
    return clientInstance;
  }

  clientInstance = await createQuicksliceClient({
    server: AUTH_CONFIG.SERVER_URL,
    clientId: AUTH_CONFIG.CLIENT_ID,
  });

  return clientInstance;
}

export async function isAuthenticated(): Promise<boolean> {
  const client = await getClient();
  return client.isAuthenticated();
}

export async function login(handle: string): Promise<void> {
  const client = await getClient();
  await client.loginWithRedirect({
    handle,
    redirectUri: window.location.origin + "/callback",
  });
}

export async function handleCallback(): Promise<void> {
  const client = await getClient();
  await client.handleRedirectCallback();
}

export async function logout(): Promise<void> {
  const client = await getClient();
  await client.logout({ reload: false });
  clientInstance = null;
}

export async function query<T>(queryString: string): Promise<T> {
  const client = await getClient();
  return client.query<T>(queryString);
}

export async function mutate<T>(mutationString: string, variables?: Record<string, unknown>): Promise<T> {
  const client = await getClient();
  return client.mutate<T>(mutationString, variables);
}
