/**
 * Spotify playback utilities using REST API with SDK fallback.
 * These are imperative functions for controlling playback.
 */

/**
 * Play a track via REST API
 */
export async function playTrack(
  spotifyUri: string,
  token: string
): Promise<void> {
  const response = await fetch(`https://api.spotify.com/v1/me/player/play`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      uris: [spotifyUri],
    }),
  });

  if (!response.ok && response.status !== 204) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  console.debug("✓ Playing via REST API:", spotifyUri);
}

/**
 * Pause playback via REST API
 */
export async function pausePlayback(token: string): Promise<void> {
  const response = await fetch(`https://api.spotify.com/v1/me/player/pause`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok && response.status !== 204) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  console.debug("✓ Paused via REST API");
}

/**
 * Play a track via Spotify Web Playback SDK with REST API fallback
 */
export async function playViaSDK(
  player: any,
  spotifyUri: string,
  token: string
): Promise<void> {
  try {
    console.debug("Attempting SDK playback:", spotifyUri);
    await player.play({
      uris: [spotifyUri],
    });
    console.debug("✓ Playing via SDK:", spotifyUri);
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.warn("SDK playback failed, falling back to REST API:", errMsg);
    // Fall back to REST API
    await playTrack(spotifyUri, token);
  }
}

/**
 * Pause via SDK with REST API fallback
 */
export async function pauseViaSDK(
  player: any,
  token: string
): Promise<void> {
  try {
    console.debug("Pausing via SDK player");
    await player.pause();
    console.debug("✓ Paused via SDK");
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.warn("SDK pause failed, falling back to REST API:", errMsg);
    // Fall back to REST API
    await pausePlayback(token);
  }
}
