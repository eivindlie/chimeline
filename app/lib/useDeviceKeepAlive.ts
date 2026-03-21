import { useEffect } from "react";

/**
 * Keep mobile device registered with Spotify by pinging /v1/me/player every 8 seconds.
 * Mobile devices drop from Spotify's registry after ~10 seconds of inactivity,
 * so we need regular pings to keep them alive.
 *
 * Only necessary on mobile (REST API). Desktop SDK auto-keeps-alive.
 */
export function useDeviceKeepAlive(token: string | null, deviceId: string | null, enabled: boolean = true) {
  useEffect(() => {
    // Only keep alive if: we have a token, a device ID, and keep-alive is enabled
    if (!enabled || !token || !deviceId) {
      return;
    }

    console.log("🔄 Device keep-alive started (8s interval)");

    const interval = setInterval(async () => {
      try {
        const response = await fetch("https://api.spotify.com/v1/me/player", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          console.warn(`Keep-alive ping failed (${response.status})`);
          return;
        }

        // Silently ping - no need to log every success
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.warn("Keep-alive ping error:", message);
      }
    }, 8000); // 8 seconds - stays alive before 10s timeout

    return () => {
      clearInterval(interval);
      console.log("🔄 Device keep-alive stopped");
    };
  }, [token, deviceId, enabled]);
}
