import { useEffect, useState } from "react";
import type { Route } from "./+types/setup";
import { useAuthRedirect } from "../lib/useAuthRedirect";
import { getToken } from "../lib/spotifyAuth";
import {
  fetchAvailableDevices,
  saveSelectedDeviceId,
  buildSpotifyTrackUri,
  SILENCE_TRACK_ID,
  type SpotifyDevice,
} from "../lib/spotifyDevices";
import styles from "./setup.module.css";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "ChimeLine - Setup" },
    { name: "description", content: "Set up your Spotify device" },
  ];
}

export default function SetupPage() {
  const [step, setStep] = useState<"welcome" | "linking" | "selecting">(
    "welcome"
  );
  const [devices, setDevices] = useState<SpotifyDevice[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);

  // Check auth and redirect to login if needed
  const isAuthed = useAuthRedirect("/setup");

  useEffect(() => {
    if (isAuthed) {
      const t = getToken();
      setToken(t);
    }
  }, [isAuthed]);

  const handleStartSetup = () => {
    setError(null);
    setStep("linking");
  };

  const handleReturnedFromApp = async () => {
    if (!token) {
      setError("Not authenticated");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const availableDevices = await fetchAvailableDevices(token);

      if (availableDevices.length === 0) {
        setError("No Spotify devices found. Make sure Spotify is open on at least one device.");
        setIsLoading(false);
        return;
      }

      // Auto-select the active device if one exists
      const activeDevice = availableDevices.find((d) => d.is_active);
      if (activeDevice) {
        setSelectedDevice(activeDevice.id);
      }

      setDevices(availableDevices);
      setStep("selecting");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmDevice = (deviceId: string) => {
    saveSelectedDeviceId(deviceId);
    setSelectedDevice(deviceId);
    // Redirect to scanner
    window.location.href = "/chimeline/scanner";
  };

  if (!isAuthed) {
    return (
      <div className={styles.container}>
        <h1>Setup</h1>
        <p>Redirecting to Spotify login...</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {step === "welcome" && (
        <div className={styles.step}>
          <h1>🎵 ChimeLine Setup</h1>
          <p>
            To play songs during the game, we need to set up a Spotify device on
            your network.
          </p>
          <p className={styles.subtitle}>
            Don't worry – we'll use a silent song, so the mystery stays intact! 🤐
          </p>

          <div className={styles.instructions}>
            <ol>
              <li>Click the button below</li>
              <li>Spotify app will open with a silent song (John Cage's 4'33")</li>
              <li>Hit play (or let it auto-play)</li>
              <li>Return to this page to complete setup</li>
            </ol>
          </div>

          <a
            href={buildSpotifyTrackUri(SILENCE_TRACK_ID)}
            className={styles.button}
            onClick={handleStartSetup}
          >
            Open Spotify to Activate Device
          </a>

          <p className={styles.hint}>
            Make sure Spotify is installed on your device
          </p>
        </div>
      )}

      {step === "linking" && (
        <div className={styles.step}>
          <h1>🎸 Opening Spotify...</h1>
          <p>
            Spotify should have opened with a silent song. Once you've hit play,
            click below to continue.
          </p>

          {error && <div className={styles.error}>{error}</div>}

          <button
            onClick={handleReturnedFromApp}
            className={styles.button}
            disabled={isLoading}
          >
            {isLoading ? "Loading devices..." : "I've returned to the browser"}
          </button>

          <p className={styles.hint}>
            If Spotify didn't open, try installing the app or copy the link manually
          </p>
        </div>
      )}

      {step === "selecting" && (
        <div className={styles.step}>
          <h1>📱 Select Your Playback Device</h1>
          <p>Choose which device will play the songs during the game:</p>

          {error && <div className={styles.error}>{error}</div>}

          <div className={styles.deviceList}>
            {devices.map((device) => (
              <div
                key={device.id}
                className={`${styles.deviceCard} ${
                  selectedDevice === device.id ? styles.selected : ""
                }`}
                onClick={() => handleConfirmDevice(device.id)}
              >
                <div className={styles.deviceName}>{device.name}</div>
                <div className={styles.deviceType}>
                  {device.type} {device.is_active ? "🔊 (Active)" : ""}
                </div>
              </div>
            ))}
          </div>

          <p className={styles.hint}>
            Click a device to select it as your playback device
          </p>
        </div>
      )}
    </div>
  );
}
