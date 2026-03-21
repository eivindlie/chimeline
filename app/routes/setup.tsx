import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { getToken } from "~/lib/spotifyAuth";
import { useAuthRedirect } from "~/lib/useAuthRedirect";
import { useSpotifyPlayer } from "~/lib/useSpotifyPlayer";
import { playTrack, pausePlayback } from "~/lib/spotifyPlayback";
import { saveSelectedDeviceId, SETUP_TRACK_ID, buildSpotifyTrackUri, fetchAvailableDevices, clearSelectedDeviceId } from "~/lib/spotifyDevices";
import styles from "./setup.module.css";

export default function Setup() {
  const navigate = useNavigate();
  const [step, setStep] = useState<"welcome" | "playing" | "success" | "error">("welcome");
  const [errorMessage, setErrorMessage] = useState("");
  const [token, setToken] = useState<string | null>(null);
  
  // Clear device ID on setup mount - fresh setup each time
  useEffect(() => {
    clearSelectedDeviceId();
  }, []);
  
  // Check auth and redirect to login if needed
  const isAuthed = useAuthRedirect("/setup");

  const isDesktop = () => {
    return !('ontouchstart' in window) && !navigator.maxTouchPoints;
  };

  // Initialize SDK on desktop only
  const { playerReady, player, deviceId, error: playerError } = useSpotifyPlayer(
    isDesktop() && step === "playing" && isAuthed ? token : null
  );

  // Get Spotify URL for mobile
  const getSpotifyRedirectUrl = () => {
    return `https://open.spotify.com/track/${SETUP_TRACK_ID}`;
  };



  // Set token when authenticated
  useEffect(() => {
    if (isAuthed) {
      const t = getToken();
      setToken(t);
    }
  }, [isAuthed]);

  // Desktop: Play via SDK when ready
  useEffect(() => {
    if (!isDesktop() || step !== "playing" || !playerReady || !player || !deviceId || !token) {
      return;
    }

    const playSetupTrack = async () => {
      try {
        // Play Chariots of Fire using the SDK
        const trackUri = buildSpotifyTrackUri(SETUP_TRACK_ID);
        await playTrack(player, trackUri, deviceId);
        
        // Save the device ID
        saveSelectedDeviceId(deviceId);

        // Give user time to hear the music (3 seconds)
        // Then pause and redirect to scanner
        setTimeout(async () => {
          try {
            await pausePlayback(player, deviceId);
          } catch (err) {
            console.warn("Could not pause, but device is ready:", err);
          }
          
          setStep("success");
          setTimeout(() => {
            navigate("/scanner");
          }, 800);
        }, 3000);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to play test track";
        console.error("Desktop setup playback error:", message);
        setErrorMessage(message);
        setStep("error");
      }
    };

    playSetupTrack();
  }, [isDesktop, step, playerReady, player, deviceId, token, navigate]);

  // Mobile: Redirect to Spotify app
  const handleMobileSetup = () => {
    setStep("playing");
    
    // Set up listener for when user returns from Spotify
    const handleVisibilityChange = async () => {
      if (document.visibilityState === "visible") {
        document.removeEventListener("visibilitychange", handleVisibilityChange);
        
        // After returning from Spotify, fetch available devices and save one
        try {
          const t = token || getToken();
          if (!t) {
            throw new Error("Not authenticated");
          }
          
          // Fetch available devices from Spotify
          const devices = await fetchAvailableDevices(t);
          
          if (devices.length === 0) {
            setErrorMessage("No active Spotify devices found. Please ensure Spotify is running.");
            setStep("error");
            return;
          }
          
          // Save the first active device (or primary)
          const deviceToUse = devices[0];
          saveSelectedDeviceId(deviceToUse.id);
          
          console.log("Mobile setup complete. Device saved:", deviceToUse.id);
        } catch (err) {
          const msg = err instanceof Error ? err.message : "Failed to fetch devices";
          console.error("Mobile setup device fetch failed:", msg);
          setErrorMessage(msg);
          setStep("error");
          return;
        }
        
        // Go to scanner
        await new Promise(resolve => setTimeout(resolve, 500));
        setStep("success");
        setTimeout(() => {
          navigate("/scanner");
        }, 800);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.location.href = getSpotifyRedirectUrl();
  };

  const handleStartPlaying = () => {
    if (isDesktop()) {
      // Desktop: Start SDK and play directly
      setStep("playing");
    } else {
      // Mobile: Redirect to Spotify app
      handleMobileSetup();
    }
  };

  if (!isAuthed) {
    return (
      <div className={styles.container}>
        <div className={styles.card}>
          <div className={styles.spinner}></div>
          <p>Connecting to Spotify...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {step === "welcome" && (
        <div className={styles.card}>
          <div className={styles.instructions}>
            <p>Click the button to open Spotify.</p>
            <p>Listen for an iconic theme—verify you hear sound.</p>
            <p>Return to the app when ready. ✨</p>
          </div>
          <button onClick={handleStartPlaying} className={styles.button}>
            Test Device
          </button>
        </div>
      )}

      {step === "playing" && (
        <div className={styles.card}>
          <div className={styles.spinner}></div>
          <p>{isDesktop() ? "Playing test track..." : "Setting up..."}</p>
        </div>
      )}

      {step === "success" && (
        <div className={styles.card}>
          <div className={styles.success}>✓</div>
          <p>Ready to play!</p>
        </div>
      )}

      {step === "error" && (
        <div className={styles.card}>
          <div className={styles.errorContent}>
            <p className={styles.errorMessage}>{errorMessage}</p>
            <button onClick={() => setStep("welcome")} className={styles.button}>
              Try Again
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
