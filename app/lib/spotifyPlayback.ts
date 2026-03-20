/**
 * Spotify Web Playback SDK-only playback utilities.
 * These are imperative functions for controlling playback via the SDK.
 * 
 * NO REST API FALLBACK - we're forcing SDK to work correctly.
 */

/**
 * Play a track via Spotify Web Playback SDK
 * Throws if player is not initialized
 */
export async function playTrack(player: any, spotifyUri: string): Promise<void> {
  if (!player) {
    throw new Error("Spotify Web Playback SDK not initialized. SDK initialization may have failed - check browser console.");
  }

  try {
    console.debug("▶ Playing track via SDK:", spotifyUri);
    await player.play({
      uris: [spotifyUri],
    });
    console.debug("✓ Playing:", spotifyUri);
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error("✗ SDK playback failed:", errMsg);
    throw new Error(`SDK playback failed: ${errMsg}`);
  }
}

/**
 * Pause playback via Spotify Web Playback SDK
 * Throws if player is not initialized
 */
export async function pausePlayback(player: any): Promise<void> {
  if (!player) {
    throw new Error("Spotify Web Playback SDK not initialized. SDK initialization may have failed - check browser console.");
  }

  try {
    console.debug("⏸ Pausing via SDK");
    await player.pause();
    console.debug("✓ Paused");
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error("✗ SDK pause failed:", errMsg);
    throw new Error(`SDK pause failed: ${errMsg}`);
  }
}
