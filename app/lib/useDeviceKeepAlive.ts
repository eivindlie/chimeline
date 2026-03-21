import { useEffect } from "react";
import { getToken } from "./spotifyAuth";
import { SETUP_TRACK_ID } from "./spotifyDevices";

/**
 * Keep mobile device registered with Spotify by playing/pausing a silent track every 8 seconds.
 * Mobile devices get completely unregistered by Spotify after ~10 seconds without playback activity.
 * 
 * Simply GETting the player endpoint is not enough—we need actual playback commands.
 * So we periodically play Chariots of Fire for 0.5 seconds, then pause.
 * This resets the timeout without being audible to the user (quick blip).
 *
 * Only necessary on mobile (REST API). Desktop SDK auto-keeps-alive.
 */
export function useDeviceKeepAlive(token: string | null, deviceId: string | null, enabled: boolean = true) {
  useEffect(() => {
    // Only keep alive if: we have a token, a device ID, and keep-alive is enabled
    if (!enabled || !token || !deviceId) {
      return;
    }

    console.log("🔄 Device keep-alive started (8s play/pause cycle)");

    const interval = setInterval(async () => {
      try {
        // Play the setup track (Chariots of Fire) on the device
        const playResponse = await fetch("https://api.spotify.com/v1/me/player/play?device_id=" + deviceId, {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            uris: [`spotify:track:${SETUP_TRACK_ID}`],
          }),
        });

        if (!playResponse.ok) {
          console.warn(`Keep-alive play failed (${playResponse.status})`);
          return;
        }

        // After 500ms, pause it back
        // This resets the timeout and stops audio without user noticing
        setTimeout(async () => {
          try {
            await fetch("https://api.spotify.com/v1/me/player/pause?device_id=" + deviceId, {
              method: "PUT",
              headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
              },
            });
          } catch (err) {
            console.warn("Keep-alive pause failed:", err instanceof Error ? err.message : String(err));
          }
        }, 500);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.warn("Keep-alive cycle failed:", message);
      }
    }, 8000); // 8 seconds - stays alive before 10s timeout

    return () => {
      clearInterval(interval);
      console.log("🔄 Device keep-alive stopped");
    };
  }, [token, deviceId, enabled]);
}
