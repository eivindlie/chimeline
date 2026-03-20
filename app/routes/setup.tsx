import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { useAuthRedirect } from "~/lib/useAuthRedirect";
import { pausePlaybackOnDevice } from "~/lib/spotifyPlayback";
import { fetchAvailableDevices, getSelectedDeviceId, saveSelectedDeviceId, SETUP_TRACK_ID } from "~/lib/spotifyDevices";
import styles from "./setup.module.css";

export default function Setup() {
  const navigate = useNavigate();
  const [step, setStep] = useState<"welcome" | "processing" | "success" | "error">("welcome");
  const [errorMessage, setErrorMessage] = useState("");
  
  // Check auth and redirect to login if needed
  const isAuthed = useAuthRedirect("/setup");

  const getSpotifyRedirectUrl = () => {
    // Open Chariots of Fire in Spotify - iconic theme, user confirms device works
    return `https://open.spotify.com/track/${SETUP_TRACK_ID}`;
  };

  const handleStartPlaying = () => {
    setStep("processing");
    // Open Spotify in a new tab (background on desktop, helps with mobile too)
    window.open(getSpotifyRedirectUrl(), "_blank");
    // Keep processing state visible while listening for return via visibilitychange
  };

  const handleReturnedFromApp = async () => {
    if (!isAuthed) {
      setErrorMessage("Authentication lost. Please try again.");
      setStep("error");
      return;
    }

    try {
      const token = sessionStorage.getItem("spotify_token");
      if (!token) {
        setErrorMessage("Authentication lost. Please log in again.");
        setStep("error");
        return;
      }

      // Fetch available devices
      const devices = await fetchAvailableDevices(token);
      if (!devices || devices.length === 0) {
        setErrorMessage("No devices found. Please ensure Spotify is running on at least one device.");
        setStep("error");
        return;
      }

      // Select the active device, or fall back to the first device
      const activeDevice = devices.find((d) => d.is_active) || devices[0];
      if (!activeDevice) {
        setErrorMessage("Could not select a device.");
        setStep("error");
        return;
      }

      // Save device
      saveSelectedDeviceId(activeDevice.id);

      // Pause playback so they don't hear Chariots of Fire when they return
      try {
        await pausePlaybackOnDevice(activeDevice.id);
      } catch (err) {
        console.warn("Could not pause playback, but device is ready:", err);
        // Non-blocking error - device is still set up correctly
      }

      setStep("success");

      // Small delay for UX feedback before redirect
      setTimeout(() => {
        navigate("/scanner");
      }, 800);
    } catch (error) {
      console.error("Error during device setup:", error);
      setErrorMessage(error instanceof Error ? error.message : "An error occurred during setup.");
      setStep("error");
    }
  };

  useEffect(() => {
    // Check if device already selected
    if (getSelectedDeviceId()) {
      navigate("/scanner");
      return;
    }

    // Listen for visibility change (user returning from Spotify)
    const handleVisibilityChange = async () => {
      if (document.visibilityState === "visible") {
        // Remove listener to prevent duplicate runs
        document.removeEventListener("visibilitychange", handleVisibilityChange);
        await handleReturnedFromApp();
      }
    };

    if (step === "processing" && isAuthed) {
      document.addEventListener("visibilitychange", handleVisibilityChange);
      return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
    }
  }, [step, isAuthed, navigate]);

  // Show loading state while auth is being checked
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
          <h1>Let's Set Up Playback</h1>
          <div className={styles.instructions}>
            <p>To play songs during the game, we need to set up your Spotify device:</p>
            <ol>
              <li><strong>Click "Start Playing!"</strong> below</li>
              <li>Spotify will open with Vangelis' "Chariots of Fire"</li>
              <li>Let it play so you can confirm your speakers work</li>
              <li>Return to ChimeLine and we'll automatically set up your device</li>
            </ol>
            <p className={styles.note}>💡 This only needs to happen once!</p>
          </div>
          <button onClick={handleStartPlaying} className={styles.button}>
            Start Playing!
          </button>
        </div>
      )}

      {step === "processing" && (
        <div className={styles.card}>
          <div className={styles.spinner}></div>
          <h2>Opening Spotify...</h2>
          <p>Listen to Chariots of Fire and confirm your speakers work.</p>
        </div>
      )}

      {step === "success" && (
        <div className={styles.card}>
          <div className={styles.success}>✓</div>
          <h2>Device Ready!</h2>
          <p>Redirecting to scanner...</p>
        </div>
      )}

      {step === "error" && (
        <div className={styles.card + " " + styles.error}>
          <h2>Setup Failed</h2>
          <p className={styles.errorMessage}>{errorMessage}</p>
          <button onClick={() => setStep("welcome")} className={styles.button}>
            Try Again
          </button>
        </div>
      )}
    </div>
  );
}
