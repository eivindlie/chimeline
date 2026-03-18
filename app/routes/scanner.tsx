import { useCallback, useEffect, useRef, useState } from "react";
import type { Route } from "./+types/scanner";
import { getToken } from "../lib/spotifyAuth";
import { startScanning, stopScanning } from "../lib/qrScanner";
import type { Html5Qrcode } from "html5-qrcode";
import type { FullCardData } from "../lib/schemas";
import styles from "./scanner.module.css";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "ChimeLine - QR Scanner" },
    { name: "description", content: "Scan QR codes to play songs" },
  ];
}

export default function ScannerPage() {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastScanned, setLastScanned] = useState<FullCardData | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [playerReady, setPlayerReady] = useState(false);

  // Initialize token on mount (client-side only)
  useEffect(() => {
    const t = getToken();
    setToken(t);
    setIsInitialized(true);
  }, []);

  // Load Spotify Web Playback SDK
  useEffect(() => {
    if (!token) return;

    const script = document.createElement("script");
    script.src = "https://sdk.scdn.co/spotify-player.js";
    document.body.appendChild(script);

    (window as any).onSpotifyWebPlaybackSDKReady = () => {
      const player = new (window as any).Spotify.Player({
        name: "ChimeLine Scanner",
        getOAuthToken: () => token,
        volume: 0, // Mute by default for silent playback
      });

      // Store player in window for access in handlePlay
      (window as any).spotifyPlayer = player;

      // Listen for when player is ready
      player.addListener("ready", ({ device_id }: any) => {
        console.debug("Spotify player ready with device ID:", device_id);
        setPlayerReady(true);
      });

      player.addListener("player_state_changed", (state: any) => {
        if (!state) return;
        setIsPlaying(!state.paused);
      });

      player.addListener("initialization_error", ({ message }: any) => {
        console.error("Spotify player init error:", message);
        setError(`Spotify player error: ${message}`);
      });

      player.addListener("authentication_error", ({ message }: any) => {
        console.error("Spotify auth error:", message);
        setError(`Spotify auth error: ${message}. Try refreshing the page.`);
      });

      player.addListener("account_error", ({ message }: any) => {
        console.error("Spotify account error:", message);
        setError(`Spotify account error: ${message}`);
      });

      player.connect().then((success: boolean) => {
        if (!success) {
          console.error("Failed to connect Spotify player");
          setError("Failed to connect Spotify player. Try refreshing.");
        }
      });
    };

    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
      setPlayerReady(false);
    };
  }, [token]);

  const handleStartScanning = () => {
    setError(null);
    setIsScanning(true);
  };

  const handleStopScanning = async () => {
    setIsScanning(false);
    if (scannerRef.current) {
      await stopScanning(scannerRef.current);
      scannerRef.current = null;
    }
  };

  const handlePlay = useCallback(
    (cardData: FullCardData) => {
      if (!token) {
        setError("Not authenticated with Spotify");
        return;
      }

      if (!playerReady) {
        setError("Spotify player not ready yet. Try again in a moment.");
        return;
      }

      const player = (window as any).spotifyPlayer;
      if (!player) {
        setError("Spotify player not initialized. Refresh the page.");
        return;
      }

      // Use the Web Playback SDK player to play the track
      player.play({
        uris: [cardData.spotifyUri],
      }).then(() => {
        console.debug("Playing:", cardData.spotifyUri);
        setIsPlaying(true);
      }).catch((err: any) => {
        const errMsg = err?.message || String(err);
        console.error("Playback error:", errMsg, err);
        setError(
          `Failed to play: ${errMsg}`
        );
      });
    },
    [token, playerReady]
  );

  const handlePause = useCallback(() => {
    if (!token) return;

    const player = (window as any).spotifyPlayer;
    if (!player) {
      setError("Spotify player not ready");
      return;
    }

    player.pause()
      .then(() => {
        console.debug("Paused");
        setIsPlaying(false);
      })
      .catch((err: any) => {
        const errMsg = err?.message || String(err);
        console.error("Pause error:", errMsg);
        setError(`Failed to pause: ${errMsg}`);
      });
  }, [token]);

  const handleStop = useCallback(() => {
    handlePause();
    setLastScanned(null);
  }, [handlePause]);

  // Start scanner when isScanning becomes true and element is mounted
  useEffect(() => {
    if (!isScanning) return;

    const startScannerWhenReady = async () => {
      // Wait for element to be in DOM
      await new Promise((resolve) => setTimeout(resolve, 50));

      try {
        const onScanCallback = (cardData: FullCardData) => {
          setLastScanned(cardData);
          handlePlay(cardData);
        };

        scannerRef.current = await startScanning(
          "qr-reader",
          onScanCallback
        );
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        setError(message);
        setIsScanning(false);
      }
    };

    startScannerWhenReady();

    return () => {
      // Cleanup if component unmounts
      if (scannerRef.current) {
        stopScanning(scannerRef.current);
      }
    };
  }, [isScanning, handlePlay]);

  if (!isInitialized) {
    return (
      <div className={styles.container}>
        <h1>QR Scanner</h1>
        <p>Loading...</p>
      </div>
    );
  }

  if (!token) {
    return (
      <div className={styles.container}>
        <h1>QR Scanner</h1>
        <div className={styles.error}>
          Please log in first to use the scanner.
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <h1>QR Scanner</h1>
      <p>Scan a QR code to play a song</p>

      <div className={styles.scannerSection}>
        {!isScanning && (
          <button
            onClick={handleStartScanning}
            className={styles.button}
          >
            Start Scanning
          </button>
        )}

        {isScanning && (
          <>
            <div id="qr-reader" className={styles.qrReader}></div>
            <button
              onClick={handleStopScanning}
              className={styles.buttonStop}
            >
              Stop Scanning
            </button>
          </>
        )}
      </div>

      {error && <div className={styles.error}>{error}</div>}

      {lastScanned && (
        <div className={styles.trackInfo}>
          <h2>Last Scanned</h2>
          <p>
            <strong>Title:</strong> {lastScanned.title}
          </p>
          <p>
            <strong>Artist:</strong> {lastScanned.artist}
          </p>
          <p>
            <strong>Release Date:</strong> {lastScanned.releaseDate}
          </p>

          <div className={styles.controls}>
            {!isPlaying ? (
              <button
                onClick={() => handlePlay(lastScanned)}
                className={styles.button}
              >
                Play
              </button>
            ) : (
              <button onClick={handlePause} className={styles.buttonPause}>
                Pause
              </button>
            )}
            <button onClick={handleStop} className={styles.buttonStop}>
              Stop
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
