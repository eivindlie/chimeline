import {
  parseSpotifyTrack,
  parseFullCardData,
  type FullCardData,
} from "./schemas";

const SPOTIFY_ENDPOINTS = {
  PLAYLIST: "https://api.spotify.com/v1/playlists",
} as const;

/**
 * Extract Spotify playlist ID from various formats:
 * - spotify:playlist:XXXX
 * - https://open.spotify.com/playlist/XXXX
 * - https://open.spotify.com/playlist/XXXX?si=...
 * - Just the ID: XXXX
 */
export function parsePlaylistUrl(input: string): string | null {
  // Try spotify:playlist:ID format
  const spotifyUriMatch = input.match(/spotify:playlist:([a-zA-Z0-9]+)/);
  if (spotifyUriMatch) return spotifyUriMatch[1];

  // Try URL format
  const urlMatch = input.match(/spotify\.com\/playlist\/([a-zA-Z0-9]+)/);
  if (urlMatch) return urlMatch[1];

  // Try plain ID (22 characters, alphanumeric)
  if (/^[a-zA-Z0-9]{22}$/.test(input)) return input;

  return null;
}

/**
 * Fetch all tracks from a Spotify playlist with pagination
 * Returns array of FullCardData for all tracks
 */
export async function fetchPlaylistTracks(
  playlistId: string,
  accessToken: string
): Promise<FullCardData[]> {
  const allTracks: FullCardData[] = [];
  let url = `${SPOTIFY_ENDPOINTS.PLAYLIST}/${playlistId}/tracks`;

  // Paginate through all tracks (Spotify returns max 100 per request)
  while (url) {
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error(
        `Failed to fetch playlist tracks: ${response.statusText}`
      );
    }

    const data = await response.json();

    // Validate and process items
    if (!Array.isArray(data.items)) {
      throw new Error("Invalid Spotify API response: missing items array");
    }

    for (const item of data.items) {
      try {
        // Each item has a 'track' property containing the actual track data
        const track = parseSpotifyTrack(item.track);
        allTracks.push(buildCardData(track));
      } catch (error) {
        console.warn(
          `Skipping invalid track: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }

    // Handle pagination - Spotify uses 'next' field for next URL
    url = data.next || "";
  }

  if (allTracks.length === 0) {
    throw new Error("Playlist contains no valid tracks");
  }

  return allTracks;
}

/**
 * Build FullCardData from Spotify track
 */
function buildCardData(track: {
  name: string;
  artists: Array<{ name: string }>;
  album: { release_date: string };
  uri: string;
}): FullCardData {
  return {
    spotifyUri: track.uri,
    title: track.name,
    artist: track.artists.map((a) => a.name).join(", "),
    releaseDate: track.album.release_date,
  };
}
