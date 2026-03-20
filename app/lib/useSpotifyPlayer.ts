import { useEffect, useState, useCallback } from "react";

/**
 * Hook to initialize and manage Spotify Web Playback SDK
 * Returns player state and the player instance for imperative control
 */
export function useSpotifyPlayer(
  token: string | null,
  onError: (message: string) => void
): {
  playerReady: boolean;
  isPlaying: boolean;
  player: any;
} {
  const [playerReady, setPlayerReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [player, setPlayer] = useState<any>(null);

  useEffect(() => {
    if (!token) {
      setPlayerReady(false);
      setPlayer(null);
      return;
    }

    console.debug("Loading Spotify Web Playback SDK...");
    const script = document.createElement("script");
    script.src = "https://sdk.scdn.co/spotify-player.js";

    script.onload = () => {
      console.debug("SDK script loaded");
    };

    script.onerror = () => {
      console.error("Failed to load Spotify SDK script");
      onError("Failed to load Spotify SDK");
    };

    document.body.appendChild(script);

    (window as any).onSpotifyWebPlaybackSDKReady = () => {
      console.debug("Spotify Web Playback SDK ready");

      const newPlayer = new (window as any).Spotify.Player({
        name: "ChimeLine Scanner",
        getOAuthToken: () => token,
        volume: 0, // Mute by default for silent playback
      });

      // Set up event listeners
      newPlayer.addListener("ready", ({ device_id }: any) => {
        console.debug("✓ Spotify player READY with device ID:", device_id);
        setPlayerReady(true);
      });

      newPlayer.addListener("player_state_changed", (state: any) => {
        console.debug("Player state changed:", state);
        if (!state) return;
        setIsPlaying(!state.paused);
      });

      newPlayer.addListener("initialization_error", ({ message }: any) => {
        console.error("✗ Spotify player init error:", message);
        onError(`Spotify player error: ${message}`);
      });

      newPlayer.addListener("authentication_error", ({ message }: any) => {
        console.error("✗ Spotify auth error:", message);
        onError(`Spotify auth error: ${message}. Try refreshing.`);
      });

      newPlayer.addListener("account_error", ({ message }: any) => {
        console.error("✗ Spotify account error:", message);
        onError(`Spotify account error: ${message}`);
      });

      console.debug("Connecting Spotify player...");
      newPlayer
        .connect()
        .then((success: boolean) => {
          if (success) {
            console.debug("✓ Player connected successfully");
            setPlayer(newPlayer);
          } else {
            console.error("✗ Failed to connect player");
            onError("Failed to connect Spotify player");
          }
        })
        .catch((err: any) => {
          console.error("✗ Connect error:", err);
          onError("Failed to connect to Spotify player");
        });
    };

    return () => {
      console.debug("Cleaning up Spotify SDK");
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
      setPlayerReady(false);
      setPlayer(null);
    };
  }, [token, onError]);

  return { playerReady, isPlaying, player };
}
