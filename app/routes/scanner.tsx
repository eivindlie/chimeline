import { useCallback, useEffect, useRef, useState } from "react";
import type { Route } from "./+types/scanner";
import { getToken } from "../lib/spotifyAuth";
import { useAuthRedirect } from "../lib/useAuthRedirect";
import { useSpotifyPlayer } from "../lib/useSpotifyPlayer";
import { playViaSDK, pauseViaSDK, playTrack, pausePlayback } from "../lib/spotifyPlayback";
import { startScanning, stopScanning } from "../lib/qrScanner";
import { getToken as getSpotifyToken } from "../lib/spotifyAuth";
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

  // Check auth and redirect to login if needed
  const isAuthed = useAuthRedirect("/scanner");

  // Initialize token once authenticated
  useEffect(() => {
    if (isAuthed) {
      const t = getToken();
      setToken(t);
    }
  }, [isAuthed]);

  // Manage Spotify playback SDK
  const { playerReady, isPlaying: sdkIsPlaying, player } = useSpotifyPlayer(
    token,
    (message) => setError(message)
  );

  // Update playing state from SDK
  useEffect(() => {
    setIsPlaying(sdkIsPlaying);
  }, [sdkIsPlaying]);

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
    async (cardData: FullCardData) => {
      if (!token) {
        setError("Not authenticated with Spotify");
        return;
      }

      setError(null);

      try {
        // Try SDK first if ready, fall back to REST API
        if (playerReady && player) {
          await playViaSDK(player, cardData.spotifyUri, token);
        } else {
          await playTrack(cardData.spotifyUri, token);
        }
        setIsPlaying(true);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        console.error("Failed to play track:", message);
        setError(`Failed to play: ${message}`);
      }
    },
    [token, playerReady, player]
  );

  const handlePause = useCallback(async () => {
    if (!token) return;

    setError(null);

    try {
      if (playerReady && player) {
        await pauseViaSDK(player, token);
      } else {
        await pausePlayback(token);
      }
      setIsPlaying(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      console.error("Failed to pause playback:", message);
      setError(`Failed to pause: ${message}`);
    }
  }, [token, playerReady, player]);

  const handleStop = useCallback(async () => {
    await handlePause();
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
          onScanCallback,
          () => getSpotifyToken()
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

  if (!isAuthed) {
    return (
      <div className={styles.container}>
        <h1>QR Scanner</h1>
        <p>Redirecting to Spotify login...</p>
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
