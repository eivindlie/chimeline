import { useState, useEffect } from "react";
import type { Route } from "./+types/_index";
import { getToken, getAuthUrl } from "../lib/spotifyAuth";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "ChimeLine - QR Code Song Player" },
    { name: "description", content: "Play songs via QR codes" },
  ];
}

export default function Home() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Check if user has a token
    const token = getToken();
    setIsLoggedIn(!!token);
  }, []);

  const handleLogin = async () => {
    setIsLoading(true);
    try {
      const clientId = import.meta.env.VITE_SPOTIFY_CLIENT_ID;
      const redirectUri = import.meta.env.VITE_SPOTIFY_REDIRECT_URI;

      if (!clientId || !redirectUri) {
        throw new Error("Missing Spotify configuration");
      }

      const authUrl = await getAuthUrl(clientId, redirectUri);
      window.location.href = authUrl;
    } catch (error) {
      console.error("Failed to initiate login:", error);
      setIsLoading(false);
    }
  };

  return (
    <div>
      <h1>Welcome to ChimeLine</h1>
      <p>A timeline-based card game with QR code song playback.</p>

      {isLoggedIn ? (
        <p>✓ You are logged in with Spotify</p>
      ) : (
        <button onClick={handleLogin} disabled={isLoading}>
          {isLoading ? "Logging in..." : "Login with Spotify"}
        </button>
      )}

      <p>Scanner and Generator coming soon...</p>
    </div>
  );
}
