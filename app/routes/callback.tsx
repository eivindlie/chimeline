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
  const [isProcessing, setIsProcessing] = useState(true);

  useEffect(() => {
    let isMounted = true; // Prevent state updates after unmount

    const handleCallback = async () => {
      const code = searchParams.get("code");
      const state = searchParams.get("state");
      const errorParam = searchParams.get("error");

      // Handle Spotify error response
      if (errorParam) {
        if (isMounted) {
          setError(`Spotify auth error: ${errorParam}`);
          setTimeout(() => navigate("/"), 2000);
        }
        return;
      }

      // Validate required parameters
      if (!code || !state) {
        if (isMounted) {
          setError("Invalid callback parameters");
          setTimeout(() => navigate("/"), 2000);
        }
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
          state,
          clientId,
          redirectUri
        );

        // Save token
        saveToken(access_token);

        // Fetch and save user profile
        const userProfile = await fetchUserProfile(access_token);
        saveUser(userProfile);

        // Success - redirect silently, don't set error
        if (isMounted) {
          navigate("/");
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        console.error("Token exchange failed:", message);
        if (isMounted) {
          setError(`Authentication failed: ${message}`);
          setTimeout(() => navigate("/"), 2000);
        }
      }
    };

    handleCallback();

    // Cleanup function
    return () => {
      isMounted = false;
    };
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
