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
  let url = `${SPOTIFY_ENDPOINTS.PLAYLIST}/${playlistId}/items`;

  console.log("Starting playlist fetch with:", {
    playlistId,
    tokenLength: accessToken.length,
    tokenPrefix: accessToken.slice(0, 20),
    firstUrl: url,
  });

  // Paginate through all tracks (Spotify returns max 100 per request)
  while (url) {
    console.log(`Fetching: ${url}`);
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    console.log(`Response status: ${response.status}`);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const spotifyErrorMessage = 
        errorData?.error?.message || 
        errorData?.message || 
        JSON.stringify(errorData);
      console.error("Spotify API error - FULL DETAILS:", {
        status: response.status,
        statusText: response.statusText,
        spotifyErrorMessage,
        fullErrorObject: errorData,
        url,
        playlistId,
        headers: {
          authorization: `Bearer ${accessToken.slice(0, 10)}...`,
        },
      });
      throw new Error(
        `Failed to fetch playlist tracks: ${response.status} ${response.statusText} - ${spotifyErrorMessage}`
      );
    }

    const data = await response.json();

    // Validate and process items
    if (!Array.isArray(data.items)) {
      throw new Error("Invalid Spotify API response: missing items array");
    }

    console.log("Playlist items response structure:", {
      itemsCount: data.items.length,
      firstItemKeys: data.items[0] ? Object.keys(data.items[0]) : "no items",
      firstItemType: data.items[0]?.type,
      firstItemTrack: data.items[0]?.track ? "present" : "missing",
      firstItemHasItem: data.items[0]?.item ? "present" : "missing",
    });

    for (const item of data.items) {
      try {
        // The /items endpoint returns items with an 'item' property
        // which contains the actual track/episode data
        if (!item.item) {
          console.warn("Item has no 'item' property:", item);
          continue;
        }
        const track = parseSpotifyTrack(item.item);
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
