import { useEffect, useState } from "react";
import { getToken, getAuthUrl } from "./spotifyAuth";

/**
 * Hook to check auth and redirect to login if needed
 * Returns true when auth is confirmed, false while waiting/redirecting
 */
export function useAuthRedirect(redirectPath: string): boolean {
  const [isAuthed, setIsAuthed] = useState(false);

  useEffect(() => {
    const token = getToken();
    
    if (token) {
      // User is authenticated
      setIsAuthed(true);
    } else {
      // User is not authenticated, initiate login
      const handleLogin = async () => {
        const clientId = import.meta.env.VITE_SPOTIFY_CLIENT_ID;
        const redirectUri = import.meta.env.VITE_SPOTIFY_REDIRECT_URI;

        if (clientId && redirectUri) {
          try {
            // Store the current route for post-auth redirect
            localStorage.setItem("auth_redirect_to", redirectPath);
            const authUrl = await getAuthUrl(clientId, redirectUri, redirectPath);
            window.location.href = authUrl;
          } catch (err) {
            console.error("Failed to initiate login:", err);
          }
        }
      };
      
      handleLogin();
    }
  }, [redirectPath]);

  return isAuthed;
}
