import { parseSpotifyTrackId, fetchTrackById } from "./spotifySearch";
import { generateQRCode } from "./qrGenerator";
import type { CardData } from "./schemas";

/**
 * Generate QR code from a Spotify track URL/URI (imperative function)
 * Handles: parse → fetch metadata → generate QR code
 * 
 * @param trackUrl - Spotify track URL, URI, or track ID
 * @param token - Spotify access token
 * @returns Promise with cardData and QR code data URL
 */
export async function generateQRFromTrackUrl(
  trackUrl: string,
  token: string
): Promise<{
  cardData: CardData;
  qrUrl: string;
}> {
  // Parse track ID from URL/URI
  const trackId = parseSpotifyTrackId(trackUrl);
  if (!trackId) {
    throw new Error(
      "Invalid Spotify track URL. Please use:\n- spotify:track:XXXX\n- https://open.spotify.com/track/XXXX\n- Track ID (22 chars)"
    );
  }

  // Fetch track metadata from Spotify API
  // fetchTrackById already returns FullCardData (converted from SpotifyTrack)
  const cardData = await fetchTrackById(trackId, token);

  // Generate QR code (handles minimization internally)
  const qrUrl = await generateQRCode(cardData);

  return { cardData, qrUrl };
}
