const SPOTIFY_ENDPOINTS = {
  AUTHORIZE: "https://accounts.spotify.com/authorize",
  TOKEN: "https://accounts.spotify.com/api/token",
} as const;

const SPOTIFY_SCOPES = [
  "streaming",
  "user-read-email",
  "user-read-private",
];

const AUTH_STORAGE_KEY = "spotify_token";
const PKCE_VERIFIER_KEY = "spotify_pkce_verifier";

/**
 * Generate PKCE code challenge and verifier
 */
export function generatePKCE(): { codeChallenge: string; codeVerifier: string } {
  const characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~";
  let codeVerifier = "";

  for (let i = 0; i < 128; i++) {
    codeVerifier += characters.charAt(
      Math.floor(Math.random() * characters.length)
    );
  }

  // Create code challenge by hashing the verifier
  const sha256 = async (plain: string) => {
    const encoder = new TextEncoder();
    const data = encoder.encode(plain);
    const hash = await crypto.subtle.digest("SHA-256", data);
    return btoa(String.fromCharCode.apply(null, Array.from(new Uint8Array(hash))))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
  };

  // For now, return a promise-like structure
  return {
    codeVerifier,
    codeChallenge: "", // Will be computed async
  };
}

/**
 * Generate PKCE challenge from verifier (async)
 */
export async function generateCodeChallenge(
  codeVerifier: string
): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(codeVerifier);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return btoa(String.fromCharCode.apply(null, Array.from(new Uint8Array(hash))))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/**
 * Get Spotify authorization URL
 */
export async function getAuthUrl(
  clientId: string,
  redirectUri: string
): Promise<string> {
  const { codeVerifier } = generatePKCE();
  const codeChallenge = await generateCodeChallenge(codeVerifier);

  // Store verifier for later exchange
  if (typeof window !== "undefined") {
    sessionStorage.setItem(PKCE_VERIFIER_KEY, codeVerifier);
  }

  const params = new URLSearchParams({
    client_id: clientId,
    response_type: "code",
    redirect_uri: redirectUri,
    scope: SPOTIFY_SCOPES.join(" "),
    code_challenge_method: "S256",
    code_challenge: codeChallenge,
  });

  return `${SPOTIFY_ENDPOINTS.AUTHORIZE}?${params.toString()}`;
}

/**
 * Exchange authorization code for access token
 */
export async function exchangeCodeForToken(
  code: string,
  clientId: string,
  redirectUri: string
): Promise<{ access_token: string; expires_in: number }> {
  const codeVerifier = sessionStorage.getItem(PKCE_VERIFIER_KEY);

  if (!codeVerifier) {
    throw new Error("Code verifier not found in session storage");
  }

  const response = await fetch(SPOTIFY_ENDPOINTS.TOKEN, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: clientId,
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
      code_verifier: codeVerifier,
    }).toString(),
  });

  if (!response.ok) {
    throw new Error(`Failed to exchange code for token: ${response.statusText}`);
  }

  const data = await response.json();
  sessionStorage.removeItem(PKCE_VERIFIER_KEY);

  return data;
}

/**
 * Save token to session storage
 */
export function saveToken(token: string): void {
  if (typeof window !== "undefined") {
    sessionStorage.setItem(AUTH_STORAGE_KEY, token);
  }
}

/**
 * Get token from session storage
 */
export function getToken(): string | null {
  if (typeof window !== "undefined") {
    return sessionStorage.getItem(AUTH_STORAGE_KEY);
  }
  return null;
}

/**
 * Clear token (logout)
 */
export function clearToken(): void {
  if (typeof window !== "undefined") {
    sessionStorage.removeItem(AUTH_STORAGE_KEY);
    sessionStorage.removeItem(PKCE_VERIFIER_KEY);
  }
}
