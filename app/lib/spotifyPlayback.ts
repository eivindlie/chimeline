/**
 * Spotify Web Playback SDK + REST API playback utilities.
 * SDK provides device registration; REST API controls playback.
 * Includes device timeout recovery via Transfer Playback API.
 */

import { getToken } from "./spotifyAuth";

/**
 * Devices become stale/inactive after ~10 seconds of inactivity.
 * Transfer Playback API revives a device by forcing Spotify to re-activate it.
 * This is used as a fallback when normal playback commands fail with device errors.
 */
export async function transferPlayback(
  deviceId: string,
  play: boolean = false
): Promise<void> {
  const token = getToken();
  if (!token) {
    throw new Error("Not authenticated with Spotify");
  }

  try {
    const response = await fetch("https://api.spotify.com/v1/me/player", {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        device_ids: [deviceId],
        play: play,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMsg = errorData.error?.message || response.statusText;
      throw new Error(`Transfer failed (${response.status}): ${errorMsg}`);
    }

    console.log(`✓ Device revived via transfer (play=${play})`);
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error("Transfer playback failed:", errMsg);
    throw err;
  }
}

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
 * 
 * If device is stale (not found), tries to revive it via Transfer Playback API
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
      
      // Device may be stale (timed out after inactivity)
      // Try to revive it via Transfer Playback API, then retry
      if (response.status === 404 || response.status === 502 || response.status === 500) {
        console.log("Device stale, attempting to revive via Transfer Playback...");
        try {
          await transferPlayback(deviceId, true); // Transfer with play=true
          console.log("Device revived, resuming playback");
          return; // Success - transferPlayback played the track
        } catch (transferErr) {
          console.error("Transfer playback failed, original error:", response.status);
          // Fall through to normal error handling
        }
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
 * 
 * If device is stale (not found), tries to revive it via Transfer Playback API
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
      
      // Device may be stale (timed out after inactivity)
      // Try to revive it via Transfer Playback API, then retry
      if (response.status === 404 || response.status === 502 || response.status === 500) {
        console.log("Device stale, attempting to revive via Transfer Playback...");
        try {
          await transferPlayback(deviceId, false); // Transfer without playing yet
          // Device is now revived, retry playTrack
          console.log("Device revived, retrying playTrack");
          return playTrack(player, spotifyUri, deviceId);
        } catch (transferErr) {
          console.error("Transfer playback failed, original error:", response.status);
          // Fall through to normal error handling
        }
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
 * 
 * If device is stale, tries to revive it via Transfer Playback API (non-blocking)
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
      // Device may be stale (timed out after inactivity)
      // Try to revive it via Transfer Playback API (non-blocking, don't throw)
      if (deviceId && (response.status === 404 || response.status === 502 || response.status === 500)) {
        console.log("Device stale during pause, attempting to revive via Transfer Playback...");
        try {
          await transferPlayback(deviceId, false); // Transfer without auto-playing
          console.log("Device revived, pause succeeded via transfer");
          return; // Success
        } catch (transferErr) {
          console.error("Transfer playback failed during pause (non-blocking)");
          // Non-blocking - don't throw, pause is best-effort
          return;
        }
      }
      
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
