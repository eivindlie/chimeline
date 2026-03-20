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

    console.debug("🎵 Loading Spotify Web Playback SDK with token...");
    const script = document.createElement("script");
    script.src = "https://sdk.scdn.co/spotify-player.js";
    
    let sdkReadyTimeout: NodeJS.Timeout | null = null;
    let isMounted = true;

    script.onload = () => {
      console.debug("✓ SDK script loaded from CDN");
    };

    script.onerror = () => {
      console.error("✗ Failed to load Spotify SDK script from CDN");
      if (isMounted) onError("Failed to load Spotify SDK");
    };

    // Set up the callback BEFORE appending the script
    (window as any).onSpotifyWebPlaybackSDKReady = () => {
      console.debug("✓ Spotify Web Playback SDK ready callback fired");
      
      if (sdkReadyTimeout) {
        clearTimeout(sdkReadyTimeout);
        sdkReadyTimeout = null;
      }

      if (!isMounted) {
        console.debug("Component unmounted, skipping player initialization");
        return;
      }

      try {
        const newPlayer = new (window as any).Spotify.Player({
          name: "ChimeLine Scanner",
          getOAuthToken: () => {
            console.debug("Spotify SDK requesting OAuth token");
            return token;
          },
          volume: 0.5, // Half volume for safety
        });

        // Set up event listeners
        newPlayer.addListener("ready", ({ device_id }: any) => {
          console.debug("✓✓ Spotify player READY with device ID:", device_id);
          if (isMounted) setPlayerReady(true);
        });

        newPlayer.addListener("player_state_changed", (state: any) => {
          console.debug("Player state changed:", state?.paused ? "paused" : "playing");
          if (!state || !isMounted) return;
          setIsPlaying(!state.paused);
        });

        newPlayer.addListener("initialization_error", ({ message }: any) => {
          console.error("✗ Spotify player init error:", message);
          if (isMounted) onError(`Spotify init error: ${message}`);
        });

        newPlayer.addListener("authentication_error", ({ message }: any) => {
          console.error("✗ Spotify auth error:", message);
          if (isMounted) onError(`Auth error: ${message}. Try logging in again.`);
        });

        newPlayer.addListener("account_error", ({ message }: any) => {
          console.error("✗ Spotify account error:", message);
          if (isMounted) onError(`Account error: ${message}`);
        });

        newPlayer.addListener("playback_error", ({ message }: any) => {
          console.error("✗ Spotify playback error:", message);
          // Don't fail on playback errors, just log them
        });

        console.debug("Connecting Spotify player to get device ID...");
        newPlayer
          .connect()
          .then((success: boolean) => {
            if (!isMounted) return;
            if (success) {
              console.debug("✓ Player connected, waiting for ready event...");
              if (isMounted) setPlayer(newPlayer);
            } else {
              console.error("✗ Spotify player connect() returned false");
              onError("Could not connect to Spotify player device");
            }
          })
          .catch((err: any) => {
            const errMsg = err instanceof Error ? err.message : String(err);
            console.error("✗ Player connect error:", errMsg);
            if (isMounted) onError(`Failed to connect Spotify player: ${errMsg}`);
          });
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        console.error("✗ Error initializing Spotify player:", errMsg);
        if (isMounted) onError(`Failed to init Spotify player: ${errMsg}`);
      }
    };

    // Set a timeout in case onSpotifyWebPlaybackSDKReady never fires
    sdkReadyTimeout = setTimeout(() => {
      console.warn("⚠️  Spotify SDK ready callback did not fire after 5 seconds");
      if (isMounted) onError("Spotify SDK failed to initialize. Check network connection.");
    }, 5000);

    document.body.appendChild(script);

    return () => {
      console.debug("Cleaning up Spotify SDK");
      isMounted = false;
      if (sdkReadyTimeout) {
        clearTimeout(sdkReadyTimeout);
      }
      // Don't remove script; other instances might use it
      setPlayerReady(false);
      setPlayer(null);
    };
  }, [token, onError]);

  return { playerReady, isPlaying, player };
}
