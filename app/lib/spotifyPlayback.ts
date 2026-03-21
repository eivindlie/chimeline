/**
 * Spotify Web Playback SDK + REST API playback utilities.
 * SDK provides device registration; REST API controls playback.
 */

import { getToken } from "./spotifyAuth";

/**
 * Check if error is a 404 (device no longer available)
 * If so, clear the device from storage
 */
export function is404Error(status: number): boolean {
  return status === 404;
}

export function clearDeviceOnNotFound() {
  // Device no longer available - clear it so user has to setup again
  localStorage.removeItem("chimeline_selected_device");
  throw new Error(
    "Device lost (404). Setup required. Please return to setup your device."
  );
}

/**
 * Resume playback from where it was paused
 * Just calls play endpoint without URI to resume current track
 * Works with REST API (compatible with both desktop SDK and mobile)
 */
export async function resumePlayback(player: any, deviceId: string | null): Promise<void> {
  if (!deviceId) {
    throw new Error("Device ID not available. Make sure setup is complete.");
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
      body: JSON.stringify({}),
    });

    if (!response.ok) {
      if (is404Error(response.status)) {
        clearDeviceOnNotFound();
      }
      const errorData = await response.json().catch(() => ({}));
      const errorMsg = errorData.error?.message || response.statusText;
      throw new Error(`REST API returned ${response.status}: ${errorMsg}`);
    }
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error("Resume failed:", errMsg);
    throw new Error(`Resume failed: ${errMsg}`);
  }
}

/**
 * Start playback of a track on the registered Spotify device
 * Uses REST API with device ID (works on both desktop SDK and mobile REST API)
 */
export async function playTrack(player: any, spotifyUri: string, deviceId: string | null): Promise<void> {
  if (!deviceId) {
    throw new Error("Device ID not available. Make sure setup is complete.");
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
      if (is404Error(response.status)) {
        clearDeviceOnNotFound();
      }
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
 * Pause playback via REST API on a specific device
 * Used when we don't have the player SDK instance (e.g., during setup)
 */
export async function pausePlaybackOnDevice(deviceId: string): Promise<void> {
  const token = getToken();
  if (!token) {
    throw new Error("Not authenticated with Spotify");
  }

  try {
    const response = await fetch(`https://api.spotify.com/v1/me/player/pause?device_id=${deviceId}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      if (is404Error(response.status)) {
        clearDeviceOnNotFound();
      }
      const errorData = await response.json().catch(() => ({}));
      const errorMsg = errorData.error?.message || response.statusText;
      throw new Error(`REST API returned ${response.status}: ${errorMsg}`);
    }
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error("Pause failed:", errMsg);
    // Non-blocking - don't fail the setup if pause fails
  }
}

/**
 * Pause playback via REST API
 * Optionally targets a specific device via deviceId
 * Works with REST API (compatible with both desktop SDK and mobile)
 */
export async function pausePlayback(player: any, deviceId?: string | null): Promise<void> {
  const token = getToken();
  if (!token) {
    throw new Error("Not authenticated with Spotify");
  }

  try {
    const url = deviceId 
      ? `https://api.spotify.com/v1/me/player/pause?device_id=${deviceId}`
      : "https://api.spotify.com/v1/me/player/pause";
    
    const response = await fetch(url, {
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
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error("✗ Pause failed:", errMsg);
    throw new Error(`Pause failed: ${errMsg}`);
  }
}
