const SPOTIFY_ENDPOINTS = {
  AUTHORIZE: "https://accounts.spotify.com/authorize",
  TOKEN: "https://accounts.spotify.com/api/token",
  USER: "https://api.spotify.com/v1/me",
} as const;

const SPOTIFY_SCOPES = [
  "streaming",
  "user-read-email",
  "user-read-private",
  "user-read-playback-state",
  "user-modify-playback-state",
  "playlist-read-private",
];

const AUTH_STORAGE_KEY = "spotify_token";
const PKCE_VERIFIER_KEY = "spotify_pkce_verifier";
const USER_STORAGE_KEY = "spotify_user";
const STATE_KEY = "spotify_oauth_state";
const REFRESH_TOKEN_KEY = "spotify_refresh_token";
const TOKEN_EXPIRY_KEY = "spotify_token_expiry";

/**
 * Generate a random state for CSRF protection
 */
function generateState(): string {
  const characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~";
  let state = "";
  for (let i = 0; i < 64; i++) {
    state += characters.charAt(
      Math.floor(Math.random() * characters.length)
    );
  }
  return state;
}

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
  redirectUri: string,
  redirectPath?: string
): Promise<string> {
  const { codeVerifier } = generatePKCE();
  const codeChallenge = await generateCodeChallenge(codeVerifier);
  const state = generateState();

  // Store verifier and state for later exchange
  if (typeof window !== "undefined") {
    sessionStorage.setItem(PKCE_VERIFIER_KEY, codeVerifier);
    sessionStorage.setItem(STATE_KEY, state);
    
    // Store redirect path in localStorage (persists through auth redirect)
    if (redirectPath) {
      localStorage.setItem("auth_redirect_to", redirectPath);
    }
  }

  const params = new URLSearchParams({
    client_id: clientId,
    response_type: "code",
    redirect_uri: redirectUri,
    scope: SPOTIFY_SCOPES.join(" "),
    code_challenge_method: "S256",
    code_challenge: codeChallenge,
    state,
  });

  return `${SPOTIFY_ENDPOINTS.AUTHORIZE}?${params.toString()}`;
}

/**
 * Get stored redirect path from localStorage and clear it
 */
export function getAndClearRedirectPath(): string | null {
  if (typeof window === "undefined") return null;
  const path = localStorage.getItem("auth_redirect_to");
  localStorage.removeItem("auth_redirect_to");
  return path;
}

/**
 * Exchange authorization code for access token
 */
export async function exchangeCodeForToken(
  code: string,
  state: string,
  clientId: string,
  redirectUri: string
): Promise<{ access_token: string; expires_in: number; refresh_token?: string }> {
  const codeVerifier = sessionStorage.getItem(PKCE_VERIFIER_KEY);
  const storedState = sessionStorage.getItem(STATE_KEY);

  if (!codeVerifier) {
    throw new Error("Code verifier not found in session storage");
  }

  // Verify state for CSRF protection
  if (state !== storedState) {
    throw new Error("State mismatch - possible CSRF attack");
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
  sessionStorage.removeItem(STATE_KEY);

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
    sessionStorage.removeItem(USER_STORAGE_KEY);
    sessionStorage.removeItem(STATE_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(TOKEN_EXPIRY_KEY);
  }
}

export function saveRefreshToken(token: string): void {
  if (typeof window !== "undefined") {
    localStorage.setItem(REFRESH_TOKEN_KEY, token);
  }
}

export function getRefreshToken(): string | null {
  if (typeof window !== "undefined") {
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  }
  return null;
}

export function saveTokenExpiry(expiresIn: number): void {
  if (typeof window !== "undefined") {
    const expiresAt = Date.now() + expiresIn * 1000;
    localStorage.setItem(TOKEN_EXPIRY_KEY, String(expiresAt));
  }
}

/**
 * Returns true if the stored token is expired or will expire within 5 minutes.
 * Returns false if no expiry info is stored (assume still valid for backwards compat).
 */
export function isTokenExpired(): boolean {
  if (typeof window === "undefined") return false;
  const expiresAt = localStorage.getItem(TOKEN_EXPIRY_KEY);
  if (!expiresAt) return false;
  return Date.now() > Number(expiresAt) - 5 * 60 * 1000;
}

/**
 * Exchange refresh token for a new access token.
 * Saves the new token and expiry. Returns the new access token, or null on failure.
 */
export async function refreshAccessToken(clientId: string): Promise<string | null> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return null;

  try {
    const response = await fetch(SPOTIFY_ENDPOINTS.TOKEN, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
        client_id: clientId,
      }).toString(),
    });

    if (!response.ok) return null;

    const data = await response.json();
    saveToken(data.access_token);
    saveTokenExpiry(data.expires_in);
    // Spotify may rotate the refresh token
    if (data.refresh_token) {
      saveRefreshToken(data.refresh_token);
    }
    return data.access_token;
  } catch {
    return null;
  }
}

/**
 * Fetch Spotify user profile
 */
export async function fetchUserProfile(
  accessToken: string
): Promise<{ display_name: string; email: string; id: string }> {
  const response = await fetch(SPOTIFY_ENDPOINTS.USER, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch user profile: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Save user profile to session storage
 */
export function saveUser(user: { display_name: string; email: string; id: string }): void {
  if (typeof window !== "undefined") {
    sessionStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
  }
}

/**
 * Get user profile from session storage
 */
export function getUser(): { display_name: string; email: string; id: string } | null {
  if (typeof window !== "undefined") {
    const user = sessionStorage.getItem(USER_STORAGE_KEY);
    return user ? JSON.parse(user) : null;
  }
  return null;
}
