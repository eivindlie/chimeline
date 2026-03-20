import { fetchTrackById as fetchFromSpotify } from "./spotifySearch";
import type { FullCardData } from "./schemas";

/**
 * Fetch complete track metadata from Spotify
 * Used after scanning a QR code or entering a track ID
 */
export async function fetchTrackMetadata(
  trackId: string,
  accessToken: string
): Promise<FullCardData> {
  console.debug("Fetching metadata for track ID:", trackId);

  try {
    const trackData = await fetchFromSpotify(trackId, accessToken);
    console.debug("Track metadata fetched:", trackData.title);
    return trackData;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error("Failed to fetch track metadata:", errorMsg);
    throw new Error(`Could not load track: ${errorMsg}`);
  }
}
