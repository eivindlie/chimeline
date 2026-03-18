import { useState, useEffect } from "react";
import type { Route } from "./+types/_index";
import { getToken, getAuthUrl, getUser, clearToken } from "../lib/spotifyAuth";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "ChimeLine - QR Code Song Player" },
    { name: "description", content: "Play songs via QR codes" },
  ];
}

export default function Home() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Check if user has a token
    const token = getToken();
    setIsLoggedIn(!!token);

    // Get user profile if logged in
    if (token) {
      const user = getUser();
      if (user) {
        setUsername(user.display_name);
      }
    }
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

  const handleLogout = () => {
    clearToken();
    setIsLoggedIn(false);
    setUsername(null);
  };

  return (
    <div>
      <h1>Welcome to ChimeLine</h1>
      <p>A timeline-based card game with QR code song playback.</p>

      {isLoggedIn ? (
        <div>
          <p>✓ You are logged in with Spotify {username && `as ${username}`}</p>
          <button onClick={handleLogout}>Logout</button>
        </div>
      ) : (
        <button onClick={handleLogin} disabled={isLoading}>
          {isLoading ? "Logging in..." : "Login with Spotify"}
        </button>
      )}

      <p>Scanner and Generator coming soon...</p>
    </div>
  );
}
