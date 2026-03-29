import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { useTranslation } from "react-i18next";
import { exchangeCodeForToken, saveToken, saveRefreshToken, saveTokenExpiry, fetchUserProfile, saveUser, getAndClearRedirectPath } from "../lib/spotifyAuth";
import styles from "./callback.module.css";

export function meta() {
  return [{ title: "ChimeLine - Authenticating..." }];
}

export default function CallbackPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

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
        const { access_token, expires_in, refresh_token } = await exchangeCodeForToken(
          code,
          state,
          clientId,
          redirectUri
        );

        // Save token and refresh credentials
        saveToken(access_token);
        saveTokenExpiry(expires_in);
        if (refresh_token) {
          saveRefreshToken(refresh_token);
        }

        // Fetch and save user profile
        const userProfile = await fetchUserProfile(access_token);
        saveUser(userProfile);

        // Get redirect destination
        const redirectTo = getAndClearRedirectPath();

        // Success - redirect
        if (isMounted) {
          navigate(redirectTo || "/");
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        console.error("Token exchange failed:", message);
        if (isMounted) {
          setError(`${message}`);
          setTimeout(() => navigate("/"), 2000);
        }
      }
    };

    handleCallback();

    return () => {
      isMounted = false;
    };
  }, [searchParams, navigate]);

  return (
    <div className={styles.container}>
      {error ? (
        <div className={styles.errorMessage} role="status">
          {error}
        </div>
      ) : (
        <div className={styles.loadingContainer}>
          <div className={styles.spinner}></div>
          <p className={styles.loadingText}>{t('callback.authenticating')}</p>
        </div>
      )}
    </div>
  );
}
