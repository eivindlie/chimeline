/**
 * CardData: The JSON payload embedded in each QR code
 */
export interface CardData {
  id: string;
  title: string;
  artist: string;
  album: string;
  spotifyUri: string;
  releaseDate: string; // ISO 8601
  era?: string;
}

/**
 * Spotify API Track response
 */
export interface SpotifyTrack {
  id: string;
  name: string;
  artists: Array<{ name: string }>;
  album: { name: string; release_date: string };
  uri: string;
}
