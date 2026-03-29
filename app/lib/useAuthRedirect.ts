import { useEffect, useState } from "react";
import { getToken, getAuthUrl, isTokenExpired, refreshAccessToken, getRefreshToken } from "./spotifyAuth";

/**
 * Hook to check auth and redirect to login if needed.
 * Attempts a silent token refresh before falling back to login redirect.
 * Returns true when auth is confirmed, false while waiting/redirecting.
 */
export function useAuthRedirect(redirectPath: string): boolean {
  const [isAuthed, setIsAuthed] = useState(false);

  useEffect(() => {
    const clientId = import.meta.env.VITE_SPOTIFY_CLIENT_ID;
    const redirectUri = import.meta.env.VITE_SPOTIFY_REDIRECT_URI;

    const handleLogin = async () => {
      if (clientId && redirectUri) {
        try {
          localStorage.setItem("auth_redirect_to", redirectPath);
          const authUrl = await getAuthUrl(clientId, redirectUri, redirectPath);
          window.location.href = authUrl;
        } catch (err) {
          console.error("Failed to initiate login:", err);
        }
      }
    };

    const checkAuth = async () => {
      const token = getToken();

      if (token && !isTokenExpired()) {
        setIsAuthed(true);
        return;
      }

      // Token missing or expired — try silent refresh
      if (getRefreshToken() && clientId) {
        console.log("Token expired, attempting silent refresh...");
        const newToken = await refreshAccessToken(clientId);
        if (newToken) {
          console.log("Silent refresh succeeded");
          setIsAuthed(true);
          return;
        }
        console.log("Silent refresh failed, redirecting to login");
      }

      handleLogin();
    };

    checkAuth();
  }, [redirectPath]);

  return isAuthed;
}
