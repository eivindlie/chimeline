import { parseSpotifyTrack, parseFullCardData, type FullCardData } from "./schemas";
import type { SpotifyTrack } from "./schemas";

const SPOTIFY_ENDPOINTS = {
  SEARCH: "https://api.spotify.com/v1/search",
  TRACK: "https://api.spotify.com/v1/tracks",
} as const;

/**
 * Extract Spotify track ID from various formats:
 * - spotify:track:XXXX
 * - https://open.spotify.com/track/XXXX
 * - https://open.spotify.com/track/XXXX?si=...
 * - Just the ID: XXXX
 */
export function parseSpotifyTrackId(input: string): string | null {
  // Try spotify:track:ID format
  const spotifyUriMatch = input.match(/spotify:track:([a-zA-Z0-9]+)/);
  if (spotifyUriMatch) return spotifyUriMatch[1];

  // Try URL format
  const urlMatch = input.match(/spotify\.com\/track\/([a-zA-Z0-9]+)/);
  if (urlMatch) return urlMatch[1];

  // Try plain ID (22 characters, alphanumeric)
  if (/^[a-zA-Z0-9]{22}$/.test(input)) return input;

  return null;
}

/**
 * Fetch a single track by ID from Spotify
 */
export async function fetchTrackById(
  trackId: string,
  accessToken: string
): Promise<FullCardData> {
  const response = await fetch(`${SPOTIFY_ENDPOINTS.TRACK}/${trackId}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch track: ${response.statusText}`);
  }

  const data = await response.json();
  
  // Validate with Zod
  let track: SpotifyTrack;
  try {
    track = parseSpotifyTrack(data);
  } catch (error) {
    throw new Error(
      `Invalid Spotify API response: ${error instanceof Error ? error.message : String(error)}`
    );
  }

  return buildCardData(track);
}

/**
 * Build FullCardData from Spotify track
 */
function buildCardData(track: SpotifyTrack): FullCardData {
  return {
    spotifyUri: track.uri,
    title: track.name,
    artist: track.artists.map((a) => a.name).join(", "),
    releaseDate: track.album.release_date,
  };
}
