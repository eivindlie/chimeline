import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import type { Route } from "./+types/devices";
import { useAuthRedirect } from "../lib/useAuthRedirect";
import { fetchAvailableDevices, getSelectedDeviceId, clearSelectedDeviceId } from "../lib/spotifyDevices";
import { getToken } from "../lib/spotifyAuth";
import type { SpotifyDevice } from "../lib/spotifyDevices";
import styles from "./devices.module.css";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "ChimeLine - Device Debug" },
    { name: "description", content: "Debug available Spotify devices" },
  ];
}

export default function DevicesPage() {
  const navigate = useNavigate();
  const [devices, setDevices] = useState<SpotifyDevice[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check auth
  const isAuthed = useAuthRedirect("/devices");

  // Fetch devices once authenticated
  useEffect(() => {
    if (!isAuthed) return;

    (async () => {
      try {
        setLoading(true);
        const token = getToken();
        if (!token) {
          setError("Not authenticated");
          return;
        }

        const fetchedDevices = await fetchAvailableDevices(token);
        setDevices(fetchedDevices);

        const selectedId = getSelectedDeviceId();
        setSelectedDeviceId(selectedId);
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        setError(errMsg);
      } finally {
        setLoading(false);
      }
    })();
  }, [isAuthed]);

  if (!isAuthed) {
    return null;
  }

  const handleLogout = () => {
    // Clear all Spotify auth tokens and device state
    localStorage.removeItem("spotify_token");
    localStorage.removeItem("spotify_user");
    localStorage.removeItem("spotify_pkce_verifier");
    localStorage.removeItem("spotify_oauth_state");
    localStorage.removeItem("chimeline_selected_device");
    localStorage.removeItem("chimeline_virtual_pause");
    localStorage.removeItem("auth_redirect_to");

    // Redirect to home
    navigate("/");
  };

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <h1 className={styles.title}>🔧 Device Debug</h1>

        {/* Selected Device Info */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Selected Device</h2>
          {selectedDeviceId ? (
            <div className={styles.selectedDevice}>
              <code className={styles.code}>{selectedDeviceId}</code>
              {devices.find((d) => d.id === selectedDeviceId) ? (
                <p className={styles.found}>✓ Device exists in active list</p>
              ) : (
                <p className={styles.warning}>⚠ Device NOT found in active list (may be stale)</p>
              )}
            </div>
          ) : (
            <p className={styles.warning}>No device selected</p>
          )}
        </section>

        {/* Available Devices List */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>
            Available Devices ({devices.length})
          </h2>

          {loading && <p className={styles.loading}>Loading devices...</p>}
          {error && <p className={styles.error}>Error: {error}</p>}

          {!loading && devices.length === 0 && (
            <p className={styles.warning}>No devices available. Ensure Spotify app is running.</p>
          )}

          {!loading && devices.length > 0 && (
            <div className={styles.devicesList}>
              {devices.map((device) => {
                const isSelected = device.id === selectedDeviceId;
                const isActive = device.is_active;

                return (
                  <div
                    key={device.id}
                    className={`${styles.deviceCard} ${isSelected ? styles.selected : ""} ${
                      isActive ? styles.active : ""
                    }`}
                  >
                    <div className={styles.header}>
                      <div className={styles.deviceName}>
                        {isSelected && <span className={styles.badge}>SELECTED</span>}
                        {isActive && <span className={styles.badgeActive}>ACTIVE</span>}
                        <span className={styles.name}>{device.name}</span>
                      </div>
                      <span className={styles.type}>{device.type}</span>
                    </div>

                    <div className={styles.properties}>
                      <div className={styles.row}>
                        <span className={styles.label}>ID:</span>
                        <code className={styles.code}>{device.id}</code>
                      </div>

                      <div className={styles.row}>
                        <span className={styles.label}>Active:</span>
                        <span className={isActive ? styles.yes : styles.no}>
                          {isActive ? "✓ Yes" : "✗ No"}
                        </span>
                      </div>

                      <div className={styles.row}>
                        <span className={styles.label}>Volume:</span>
                        <span>{device.volume_percent}%</span>
                      </div>

                      <div className={styles.row}>
                        <span className={styles.label}>Private Session:</span>
                        <span className={device.is_private_session ? styles.yes : styles.no}>
                          {device.is_private_session ? "Yes" : "No"}
                        </span>
                      </div>

                      <div className={styles.row}>
                        <span className={styles.label}>Restricted:</span>
                        <span className={device.is_restricted ? styles.warning : styles.no}>
                          {device.is_restricted ? "Yes (restricted)" : "No"}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Navigation */}
        <section className={styles.section}>
          <button className={styles.button} onClick={() => navigate("/scanner")}>
            Back to Scanner
          </button>
          <button className={styles.logoutButton} onClick={handleLogout}>
            🚪 Logout & Clear Auth
          </button>
        </section>
      </div>
    </div>
  );
}
