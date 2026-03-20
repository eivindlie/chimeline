/**
 * Spotify Web Playback SDK + REST API playback utilities.
 * SDK provides device registration; REST API controls playback.
 */

import { getToken } from "./spotifyAuth";

/**
 * Start playback of a track on the registered Spotify device
 * Uses REST API with device ID from SDK player
 */
export async function playTrack(player: any, spotifyUri: string, deviceId: string | null): Promise<void> {
  if (!player) {
    throw new Error("Spotify Web Playback SDK not initialized. SDK initialization may have failed - check browser console.");
  }

  if (!deviceId) {
    throw new Error("Device ID not available. Spotify player may not be ready.");
  }

  const token = getToken();
  if (!token) {
    throw new Error("Not authenticated with Spotify");
  }

  try {
    const response = await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        uris: [spotifyUri],
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMsg = errorData.error?.message || response.statusText;
      throw new Error(`REST API returned ${response.status}: ${errorMsg}`);
    }
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error("Playback failed:", errMsg);
    throw new Error(`Playback failed: ${errMsg}`);
  }
}

/**
 * Pause playback via REST API
 */
export async function pausePlayback(player: any): Promise<void> {
  if (!player) {
    throw new Error("Spotify Web Playback SDK not initialized");
  }

  const token = getToken();
  if (!token) {
    throw new Error("Not authenticated with Spotify");
  }

  try {
    console.debug("⏸ Pausing via REST API");
    
    const response = await fetch("https://api.spotify.com/v1/me/player/pause", {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMsg = errorData.error?.message || response.statusText;
      throw new Error(`REST API returned ${response.status}: ${errorMsg}`);
    }

    console.debug("✓ Paused");
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error("✗ Pause failed:", errMsg);
    throw new Error(`Pause failed: ${errMsg}`);
  }
}
