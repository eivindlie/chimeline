/**
 * Virtual pause implementation
 * 
 * Never actually call Spotify pause endpoint.
 * Instead, simulate pause by:
 * 1. Getting current player state (position, volume, track)
 * 2. Setting volume to 1% (keeps device alive, barely audible)
 * 3. Storing position for later resume
 * 
 * When resuming:
 * 1. Seek to stored position
 * 2. Wait 100-300ms for seek to complete
 * 3. Restore volume to previous level
 * 
 * Playback always continues in background (repeat=track prevents track ending)
 */

import {
  getPlayerState,
  setVolumePercent,
  seekToPosition,
  setRepeatMode,
} from "./spotifyPlayback";
import type {
  VirtualPauseState,
} from "./virtualPause";
import {
  saveVirtualPauseState,
  getVirtualPauseState,
} from "./virtualPause";

const VIRTUAL_PAUSE_VOLUME = 1; // 1% is barely audible, won't trigger iOS sleep

/**
 * Initialize playback with repeat mode and volume
 */
export async function initializePlayback(deviceId: string): Promise<void> {
  try {
    // Enable repeat track mode so it loops indefinitely
    // This prevents device from going inactive when track ends
    await setRepeatMode("track");
    console.log("✓ Repeat mode enabled (track)");
  } catch (err) {
    console.warn("Failed to enable repeat mode:", err);
    // Non-blocking - continue even if repeat fails
  }
}

/**
 * Simulate pause by reducing volume and storing position
 * Does NOT call the pause endpoint
 */
export async function virtualPause(deviceId: string): Promise<void> {
  try {
    // Get current player state before we change it
    const state = await getPlayerState(deviceId);

    if (!state || !state.is_playing) {
      console.log("Already paused or no playback state");
      return;
    }

    // Store state for resume
    const pauseState: VirtualPauseState = {
      isPaused: true,
      storedPosition: state.progress_ms || 0,
      previousVolume: state.device?.volume_percent || 80,
      trackUri: state.item?.uri || "",
    };

    saveVirtualPauseState(pauseState);

    // Mute audio to 1% (not 0, as that can cause iOS sleep)
    await setVolumePercent(deviceId, VIRTUAL_PAUSE_VOLUME);

    console.log(
      `⏸ Virtual pause: volume→1%, position stored at ${pauseState.storedPosition}ms`
    );
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error("Virtual pause failed:", errMsg);
    throw err;
  }
}

/**
 * Simulate resume by seeking to stored position and restoring volume
 * Does NOT call the play endpoint (playback never stopped)
 */
export async function virtualResume(deviceId: string): Promise<void> {
  try {
    const pauseState = getVirtualPauseState();

    if (!pauseState.isPaused) {
      console.log("Not paused, resume not necessary");
      return;
    }

    // Seek to stored position
    await seekToPosition(deviceId, pauseState.storedPosition);

    // Wait for seek to complete before restoring volume
    await new Promise((resolve) => setTimeout(resolve, 200));

    // Restore volume to restore audio
    await setVolumePercent(deviceId, pauseState.previousVolume);

    console.log(
      `▶ Virtual resume: restored to position ${pauseState.storedPosition}ms, volume→${pauseState.previousVolume}%`
    );

    // Clear pause state
    pauseState.isPaused = false;
    saveVirtualPauseState(pauseState);
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error("Virtual resume failed:", errMsg);
    throw err;
  }
}

/**
 * Check if currently in virtual pause state
 */
export function isVirtuallyPaused(): boolean {
  return getVirtualPauseState().isPaused;
}
