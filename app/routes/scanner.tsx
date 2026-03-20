import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "@react-router/react";
import type { Route } from "./+types/scanner";
import { useAuthRedirect } from "../lib/useAuthRedirect";
import { useSpotifyPlayer } from "../lib/useSpotifyPlayer";
import { playTrack, pausePlayback } from "../lib/spotifyPlayback";
import { scanQRCode, stopScanning } from "../lib/qrScanner";
import { getToken } from "../lib/spotifyAuth";
import { getSelectedDeviceId } from "../lib/spotifyDevices";
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
  const navigate = useNavigate();
  const [isScanning, setIsScanning] = useState(false);
  const [isLoadingTrack, setIsLoadingTrack] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastScanned, setLastScanned] = useState<FullCardData | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);

  // Check auth and redirect to login if needed
  const isAuthed = useAuthRedirect("/scanner");

  // Initialize token and device ID once authenticated
  useEffect(() => {
    if (isAuthed) {
      const t = getToken();
      setToken(t);
      
      const savedDeviceId = getSelectedDeviceId();
      setSelectedDeviceId(savedDeviceId);
      
      // Redirect to setup if device not selected
      if (!savedDeviceId) {
        navigate("/setup");
      }
    }
  }, [isAuthed, navigate]);

  // Manage Spotify playback SDK
  const { playerReady, isPlaying: sdkIsPlaying, player, deviceId, error: playerError } = useSpotifyPlayer(
    token
  );

  // Update playing state from SDK and display SDK errors
  useEffect(() => {
    setIsPlaying(sdkIsPlaying);
    if (playerError) {
      setError(playerError);
    }
  }, [sdkIsPlaying, playerError]);

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

      if (!selectedDeviceId) {
        setError(
          "No Spotify device selected. Please complete the setup first. Go to the home page and click 'Setup Device'."
        );
        return;
      }

      if (!playerReady || !player) {
        setError(
          "Spotify Web Playback SDK not ready. " +
            "Check browser console for initialization errors. " +
            "Try refreshing the page."
        );
        console.error("Player not initialized", {
          playerReady,
          playerExists: !!player,
        });
        return;
      }

      setError(null);

      try {
        await playTrack(player, cardData.spotifyUri, selectedDeviceId);
        setIsPlaying(true);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        console.error("Failed to play track:", message);
        setError(`Playback failed: ${message}`);
      }
    },
    [token, playerReady, player, selectedDeviceId]
  );

  const handlePause = useCallback(async () => {
    if (!playerReady || !player) {
      setError("Spotify playback not available");
      return;
    }

    setError(null);

    try {
      await pausePlayback(player, selectedDeviceId);
      setIsPlaying(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      console.error("Pause failed:", message);
      setError(`Pause failed: ${message}`);
    }
  }, [playerReady, player, selectedDeviceId]);

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

        // Step 1: Scan QR and get track ID
        const trackId = await scanQRCode("qr-reader");
        setIsScanning(false);

        // Step 2: Fetch metadata from Spotify
        setIsLoadingTrack(true);

        if (!token) {
          throw new Error("Not authenticated with Spotify");
        }

        const fullData = await fetchTrackMetadata(trackId, token);
        setLastScanned(fullData);

        // Step 3: Attempt to auto-play the track (but don't fail if it errors)
        try {
          await handlePlay(fullData);
        } catch (playbackError) {
          const playbackMsg =
            playbackError instanceof Error
              ? playbackError.message
              : "Unknown error";
          console.warn("Playback failed (non-blocking):", playbackMsg);
          // Don't fail the scan—metadata loaded successfully
          // User can manually click Play if needed
        }
        setIsLoadingTrack(false);
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

  if (!selectedDeviceId) {
    return (
      <div className={styles.container}>
        <h1>QR Scanner</h1>
        <div className={styles.error}>
          <p>No Spotify device configured</p>
        </div>
        <p>Before you can scan QR codes, you need to complete the device setup:</p>
        <a href="/" className={styles.button}>
          Go Home & Setup Device
        </a>
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
          <h2>✅ Track Loaded</h2>
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
