import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { exchangeCodeForToken, saveToken, fetchUserProfile, saveUser } from "../lib/spotifyAuth";

export function meta() {
  return [{ title: "ChimeLine - Authenticating..." }];
}

export default function CallbackPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleCallback = async () => {
      const code = searchParams.get("code");
      const errorParam = searchParams.get("error");

      if (errorParam) {
        setError(`Spotify auth error: ${errorParam}`);
        setTimeout(() => navigate("/"), 3000);
        return;
      }

      if (!code) {
        setError("No authorization code received");
        setTimeout(() => navigate("/"), 3000);
        return;
      }

      try {
        const clientId = import.meta.env.VITE_SPOTIFY_CLIENT_ID;
        const redirectUri = import.meta.env.VITE_SPOTIFY_REDIRECT_URI;

        if (!clientId || !redirectUri) {
          throw new Error("Missing Spotify configuration");
        }

        // Exchange code for token
        const { access_token } = await exchangeCodeForToken(
          code,
          clientId,
          redirectUri
        );

        // Save token
        saveToken(access_token);

        // Fetch and save user profile
        const userProfile = await fetchUserProfile(access_token);
        saveUser(userProfile);

        // Redirect to home
        navigate("/");
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        console.error("Token exchange failed:", message);
        setError(`Authentication failed: ${message}`);
        setTimeout(() => navigate("/"), 3000);
      }
    };

    handleCallback();
  }, [searchParams, navigate]);

  if (error) {
    return (
      <div>
        <p style={{ color: "red" }}>{error}</p>
        <p>Redirecting...</p>
      </div>
    );
  }

  return <div>Processing authentication...</div>;
}
