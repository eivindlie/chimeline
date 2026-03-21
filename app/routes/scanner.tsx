import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router";
import type { Route } from "./+types/scanner";
import { useAuthRedirect } from "../lib/useAuthRedirect";
import { useSpotifyPlayer } from "../lib/useSpotifyPlayer";
import { playTrack, pausePlayback, resumePlayback } from "../lib/spotifyPlayback";
import { scanQRCode, stopScanning } from "../lib/qrScanner";
import { getToken } from "../lib/spotifyAuth";
import { getSelectedDeviceId } from "../lib/spotifyDevices";
import { fetchTrackMetadata } from "../lib/trackMetadata";
import type { FullCardData } from "../lib/schemas";
import LogoIcon from "../assets/logo-icon-dark.svg";
import styles from "./scanner.module.css";

/**
 * Minimal scanner UI:
 * - Initial: Just "Start Scanning" button
 * - Playing: Circular play/pause button + subtle "Scan next" button
 * - Mobile-first design (optimized for game-time use)
 */

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

  // Update playing state from SDK
  useEffect(() => {
    setIsPlaying(sdkIsPlaying);
    if (playerError) {
      console.warn("Player error:", playerError);
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
        setError("No device configured. Go to setup.");
        return;
      }

      if (!playerReady || !player) {
        setError("Playback not ready. Try refreshing.");
        console.error("Player not initialized", { playerReady, playerExists: !!player });
        return;
      }

      setError(null);

      try {
        await playTrack(player, cardData.spotifyUri, selectedDeviceId);
        setIsPlaying(true);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        console.error("Failed to play track:", message);
        
        if (message.includes("Setup required")) {
          navigate("/setup");
          return;
        }
        
        setError(`Playback failed: ${message}`);
      }
    },
    [token, playerReady, player, selectedDeviceId, navigate]
  );

  const handlePause = useCallback(async () => {
    if (!playerReady || !player) {
      setError("Playback not available");
      return;
    }

    setError(null);

    try {
      await pausePlayback(player, selectedDeviceId);
      setIsPlaying(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      console.error("Pause failed:", message);
      
      if (message.includes("Setup required")) {
        navigate("/setup");
        return;
      }
      
      setError(`Pause failed: ${message}`);
    }
  }, [playerReady, player, selectedDeviceId, navigate]);

  const handlePlayPause = useCallback(async () => {
    if (!lastScanned) return;
    
    if (isPlaying) {
      await handlePause();
    } else {
      try {
        await resumePlayback(player, selectedDeviceId);
        setIsPlaying(true);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        console.error("Resume failed:", message);
          
        if (message.includes("Setup required")) {
          navigate("/setup");
          return;
        }
        
        setError(`Resume failed: ${message}`);
      }
    }
  }, [isPlaying, lastScanned, player, selectedDeviceId, handlePause, navigate]);

  const handleScanNext = useCallback(async () => {
    // Pause current playback
    await handlePause();
    
    // Reset state and start scanning again
    setLastScanned(null);
    setIsLoadingTrack(false);
    setError(null);
    setIsScanning(true);
  }, [handlePause]);

  // Start scanner when isScanning becomes true
  useEffect(() => {
    if (!isScanning) return;

    const startScannerWhenReady = async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));

      try {
        setError(null);
        setIsLoadingTrack(false);

        const trackId = await scanQRCode("qr-reader");
        setIsScanning(false);

        setIsLoadingTrack(true);

        if (!token) {
          throw new Error("Not authenticated");
        }

        const fullData = await fetchTrackMetadata(trackId, token);
        setLastScanned(fullData);

        try {
          await handlePlay(fullData);
        } catch (playbackError) {
          console.warn("Playback failed (non-blocking):", playbackError);
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
      stopScanning();
    };
  }, [isScanning, handlePlay, token]);

  if (!isAuthed) {
    return (
      <div className={styles.container}>
        <p>Redirecting to login...</p>
      </div>
    );
  }

  if (!selectedDeviceId) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>Device not configured</div>
        <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)" }}>
          Go to setup first
        </p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Logo header */}
      <div className={styles.logoHeader}>
        <img src={LogoIcon} alt="ChimeLine" className={styles.logo} />
      </div>

      {/* Initial state: Just scan button */}
      {!lastScanned && !isScanning && (
        <button
          onClick={handleStartScanning}
          className={styles.scanButton}
        >
          Start Scanning
        </button>
      )}

      {/* Scanning state: Camera view */}
      {isScanning && (
        <>
          <div id="qr-reader" className={styles.qrReader}></div>
          <button
            onClick={handleStopScanning}
            className={styles.stopButton}
          >
            Cancel
          </button>
        </>
      )}

      {/* Loading state */}
      {isLoadingTrack && (
        <div className={styles.loadingContainer}>
          <div className={styles.spinner}></div>
          <p>Loading...</p>
        </div>
      )}

      {/* Playing state: Circular play/pause + scan next */}
      {lastScanned && !isLoadingTrack && (
        <div className={styles.playingContainer}>
          <button
            onClick={handlePlayPause}
            className={`${styles.playButton} ${isPlaying ? styles.playing : ""}`}
            title={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? (
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
          </button>

          <button
            onClick={handleScanNext}
            className={styles.scanNextButton}
          >
            📱 Scan next
          </button>
        </div>
      )}

      {error && (
        <div className={styles.error}>
          {error}
        </div>
      )}
    </div>
  );
}
