/**
 * Virtual pause implementation
 *
 * Never call the Spotify pause endpoint — paused devices disappear after ~10s.
 * Instead, simulate pause by switching to a silent track (John Cage – 4'33'').
 *
 * On pause:
 * 1. Read current player state (position, track URI)
 * 2. Store position + URI for later resume
 * 3. Switch playback to 4'33'' (completely silent, device stays alive)
 *
 * On resume:
 * 1. Switch back to the original track URI
 * 2. Seek to the stored position
 *
 * This avoids the REST API volume endpoint entirely, which returns 403
 * on iOS regardless of scopes.
 */

import {
  playTrack,
  getPlayerState,
  seekToPosition,
  setRepeatMode,
} from "./spotifyPlayback";
import type { VirtualPauseState } from "./virtualPause";
import {
  saveVirtualPauseState,
  getVirtualPauseState,
  clearVirtualPauseState,
} from "./virtualPause";

// John Cage – 4'33'' (completely silent, ideal as a pause placeholder)
const SILENCE_TRACK_URI = "spotify:track:2bNCdW4rLnCTzgqUXTTDO1";

/**
 * Initialize playback with repeat mode so the device stays alive indefinitely
 */
export async function initializePlayback(_deviceId: string): Promise<void> {
  try {
    await setRepeatMode("track");
    console.log("✓ Repeat mode enabled (track)");
  } catch (err) {
    console.warn("Failed to enable repeat mode:", err);
    // Non-blocking — continue even if repeat fails
  }
}

/**
 * Simulate pause by switching to a silent track and storing the current position.
 * Does NOT call the pause endpoint.
 */
export async function virtualPause(deviceId: string): Promise<void> {
  const state = await getPlayerState(deviceId);

  if (!state || !state.is_playing) {
    console.log("Already paused or no playback state");
    return;
  }

  const pauseState: VirtualPauseState = {
    isPaused: true,
    storedPosition: state.progress_ms || 0,
    trackUri: state.item?.uri || "",
  };

  saveVirtualPauseState(pauseState);

  // Switch to silence and loop it — device stays active indefinitely
  await playTrack(null, SILENCE_TRACK_URI, deviceId);
  await setRepeatMode("track");

  console.log(`⏸ Virtual pause: switched to 4'33'' (looping), position stored at ${pauseState.storedPosition}ms`);
}

/**
 * Simulate resume by switching back to the original track and seeking to the stored position.
 */
export async function virtualResume(deviceId: string): Promise<void> {
  const pauseState = getVirtualPauseState();

  if (!pauseState.isPaused) {
    console.log("Not paused, resume not necessary");
    return;
  }

  // Switch back to the original track
  await playTrack(null, pauseState.trackUri, deviceId);

  // Wait briefly for the track switch to take effect before seeking
  await new Promise((resolve) => setTimeout(resolve, 300));

  await seekToPosition(deviceId, pauseState.storedPosition);

  clearVirtualPauseState();

  console.log(`▶ Virtual resume: back to original track at ${pauseState.storedPosition}ms`);
}

/**
 * Check if currently in virtual pause state
 */
export function isVirtuallyPaused(): boolean {
  return getVirtualPauseState().isPaused;
}

/**
 * Clear virtual pause state when starting a new track.
 * The new playTrack call will already overwrite 4'33'', so no extra
 * API call is needed — just clear the stored state.
 */
export async function restoreVolume(_deviceId: string): Promise<void> {
  clearVirtualPauseState();
}
