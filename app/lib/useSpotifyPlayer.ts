import { useEffect, useState, useCallback, useRef } from "react";

/**
 * Hook to initialize and manage Spotify Web Playback SDK
 * Returns player state, playing state, and any errors that occurred
 * 
 * Self-contained: doesn't depend on parent callback stability
 * Manages its own error state instead of calling parent callback
 */
export function useSpotifyPlayer(token: string | null): {
  playerReady: boolean;
  isPlaying: boolean;
  player: any;
  deviceId: string | null;
  error: string | null;
} {
  const [playerReady, setPlayerReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [player, setPlayer] = useState<any>(null);
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Track if SDK is already initializing
  const sdkInitializingRef = useRef(false);

  useEffect(() => {
    if (!token) {
      setPlayerReady(false);
      setPlayer(null);
      return;
    }

    // Prevent multiple simultaneous SDK initializations
    if (sdkInitializingRef.current) {
      return;
    }

    sdkInitializingRef.current = true;
    let isMounted = true;
    let sdkReadyTimeout: NodeJS.Timeout | null = null;

    const script = document.createElement("script");
    script.src = "https://sdk.scdn.co/spotify-player.js";
    
    script.onload = () => {
      // SDK script loaded
    };

    script.onerror = () => {
      console.error("✗ Failed to load Spotify SDK script from CDN");
      if (isMounted) setError("Failed to load Spotify SDK");
      sdkInitializingRef.current = false;
    };

    // Set up the callback BEFORE appending the script
    (window as any).onSpotifyWebPlaybackSDKReady = () => {
      if (sdkReadyTimeout) {
        clearTimeout(sdkReadyTimeout);
        sdkReadyTimeout = null;
      }

      if (!isMounted) {
        sdkInitializingRef.current = false;
        return;
      }

      try {
        const newPlayer = new (window as any).Spotify.Player({
          name: "ChimeLine Scanner",
          getOAuthToken: (callback: any) => {
            // IMPORTANT: SDK expects a callback, not a return value!
            const currentToken = token;
            if (!currentToken) {
              console.error("No token available for Spotify SDK");
              callback(null);
              return;
            }
            callback(currentToken);  // Use callback pattern!
          },
          volume: 0.5,
        });

        // Set up event listeners BEFORE calling connect
        // Wrap each listener in try-catch to isolate failures
        try {
          newPlayer.addListener("ready", ({ device_id }: any) => {
            if (isMounted) {
              setDeviceId(device_id);  // Store the device ID!
              setPlayerReady(true);
            }
          });
        } catch (err) {
          console.error("✗ Failed to register ready listener:", err);
        }

        try {
          newPlayer.addListener("player_state_changed", (state: any) => {
            if (!state || !isMounted) return;
            setIsPlaying(!state.paused);
          });
        } catch (err) {
          console.error("✗ Failed to register player_state_changed listener:", err);
        }

        try {
          newPlayer.addListener("initialization_error", ({ message }: any) => {
            console.error("Spotify player init error:", message);
            if (isMounted) setError(`Spotify init error: ${message}`);
          });
        } catch (err) {
          console.error("✗ Failed to register initialization_error listener:", err);
        }

        try {
          newPlayer.addListener("authentication_error", ({ message }: any) => {
            console.error("Spotify auth error:", message);
            if (isMounted) setError(`Auth error: ${message}. Try logging in again.`);
          });
        } catch (err) {
          console.error("✗ Failed to register authentication_error listener:", err);
        }

        try {
          newPlayer.addListener("account_error", ({ message }: any) => {
            console.error("Spotify account error:", message);
            if (isMounted) setError(`Account error: ${message}`);
          });
        } catch (err) {
          console.error("✗ Failed to register account_error listener:", err);
        }

        try {
          newPlayer.addListener("playback_error", ({ message }: any) => {
            console.error("Spotify playback error:", message);
            // Don't fail on playback errors, just log them
          });
        } catch (err) {
          console.error("✗ Failed to register playback_error listener:", err);
        }

        try {
          newPlayer.addListener("discrepancies_found", (discrepancies: any) => {
            console.warn("Spotify discrepancies found:", discrepancies);
          });
        } catch (err) {
          console.error("Failed to register discrepancies_found listener:", err);
        }

        // Set a timeout for player.connect() in case it hangs
        let connectTimeoutId: NodeJS.Timeout | null = null;
        const connectPromise = newPlayer.connect();
        
        connectTimeoutId = setTimeout(() => {
          console.error("Spotify player connection timeout");
          if (isMounted) setError("Spotify player connection timeout. Try refreshing the page.");
          sdkInitializingRef.current = false;
          connectTimeoutId = null;
        }, 10000);
        
        connectPromise
          .then((success: boolean) => {
            if (connectTimeoutId) {
              clearTimeout(connectTimeoutId);
              connectTimeoutId = null;
            }
            if (!isMounted) {
              sdkInitializingRef.current = false;
              return;
            }
            if (success) {
              if (isMounted) setPlayer(newPlayer);
            } else {
              console.error("Spotify player connect() returned false");
              setError("Could not connect to Spotify player device");
            }
            sdkInitializingRef.current = false;
          })
          .catch((err: any) => {
            // Clear connect timeout if error occurs
            if (connectTimeoutId) {
              clearTimeout(connectTimeoutId);
              connectTimeoutId = null;
            }
            const errMsg = err instanceof Error ? err.message : String(err);
            console.error("Spotify player connect error:", errMsg);
            if (isMounted) setError(`Failed to connect Spotify player: ${errMsg}`);
            sdkInitializingRef.current = false;
          });
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        console.error("Exception during Spotify player init:", errMsg);
        if (isMounted) setError(`Failed to init Spotify player: ${errMsg}`);
        sdkInitializingRef.current = false;
      }
    };

    // Set a timeout in case onSpotifyWebPlaybackSDKReady never fires
    sdkReadyTimeout = setTimeout(() => {
      console.warn("Spotify SDK ready callback did not fire after 5 seconds");
      if (isMounted) setError("Spotify SDK failed to initialize. Check network connection.");
      sdkInitializingRef.current = false;
    }, 5000);

    document.body.appendChild(script);

    return () => {
      isMounted = false;
      if (sdkReadyTimeout) {
        clearTimeout(sdkReadyTimeout);
      }
      // Don't remove script; other instances might use it
      setPlayerReady(false);
      setPlayer(null);
    };
  }, [token]); // Re-run when token becomes available (login), DOM check prevents duplicates

  return { playerReady, isPlaying, player, deviceId, error };
}
