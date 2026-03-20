import { useCallback, useEffect, useState } from "react";
import type { Route } from "./+types/scanner";
import { useAuthRedirect } from "../lib/useAuthRedirect";
import { useSpotifyPlayer } from "../lib/useSpotifyPlayer";
import { playViaSDK, pauseViaSDK, playTrack, pausePlayback } from "../lib/spotifyPlayback";
import { scanQRCode, stopScanning } from "../lib/qrScanner";
import { getToken } from "../lib/spotifyAuth";
import { fetchTrackMetadata } from "../lib/trackMetadata";
import type { FullCardData } from "../lib/schemas";
import styles from "./scanner.module.css";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "ChimeLine - QR Scanner" },
    { name: "description", content: "Scan QR codes to play songs" },
  ];
}

export default function ScannerPage() {
  const [isScanning, setIsScanning] = useState(false);
  const [isLoadingTrack, setIsLoadingTrack] = useState(false);
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

  const handleStopScanning = () => {
    setIsScanning(false);
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
        setError(null);
        setIsLoadingTrack(false);

        console.debug("Scanner: Waiting for QR code...");

        // Step 1: Scan QR and get track ID
        const trackId = await scanQRCode("qr-reader");
        console.debug("Scanner: Got track ID:", trackId);
        setIsScanning(false);

        // Step 2: Fetch metadata from Spotify
        setIsLoadingTrack(true);

        if (!token) {
          throw new Error("Not authenticated with Spotify");
        }

        console.debug("Scanner: Fetching metadata...");
        const fullData = await fetchTrackMetadata(trackId, token);
        console.debug("Scanner: Got metadata:", fullData.title);
        setLastScanned(fullData);

        // Step 3: Auto-play the track
        console.debug("Scanner: Starting playback...");
        await handlePlay(fullData);
        console.debug("Scanner: Playback started");
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        console.error("Scanner error:", message);
        setError(message);
        setLastScanned(null);
        setIsLoadingTrack(false);
        setIsScanning(false);
      }
    };

    startScannerWhenReady();

    return () => {
      // Cleanup: ensure scanner stops if component unmounts
      stopScanning();
    };
  }, [isScanning, handlePlay, token]);

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

      {isLoadingTrack && (
        <div className={styles.loadingMessage}>
          <p>🎵 Loading track...</p>
        </div>
      )}

      {lastScanned && !isLoadingTrack && (
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
