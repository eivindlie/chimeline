import { z } from "zod";

/**
 * Spotify API response schemas with runtime validation
 */

// Spotify artist object
const SpotifyArtistSchema = z.object({
  name: z.string(),
});

// Spotify album object
const SpotifyAlbumSchema = z.object({
  name: z.string(),
  release_date: z.string(), // YYYY-MM-DD format
});

// Spotify track object (from API)
export const SpotifyTrackSchema = z.object({
  id: z.string(),
  name: z.string(),
  artists: z.array(SpotifyArtistSchema),
  album: SpotifyAlbumSchema,
  uri: z.string(), // spotify:track:XXXX
});

// Derived TypeScript type from schema
export type SpotifyTrack = z.infer<typeof SpotifyTrackSchema>;

/**
 * Full CardData - internal representation with all field names
 */
export const FullCardDataSchema = z.object({
  spotifyUri: z.string(),
  title: z.string(),
  artist: z.string(),
  releaseDate: z.string(), // YYYY-MM-DD format
});

export type FullCardData = z.infer<typeof FullCardDataSchema>;

/**
 * Track Identifier - minimal format for QR codes (ID only)
 * id: Spotify track ID (e.g., "6YPh5u1TRE0eN6kZ0KCfAV")
 * Full metadata is fetched from Spotify API when QR is scanned
 */
export const TrackIdentifierSchema = z.object({
  id: z.string(), // Spotify track ID
});

export type TrackIdentifier = z.infer<typeof TrackIdentifierSchema>;

// Type alias for backwards compatibility in components
export type CardData = FullCardData;

/**
 * Convert full CardData to track identifier for QR encoding
 * Extracts track ID from Spotify URI
 */
export function toTrackIdentifier(full: FullCardData): TrackIdentifier {
  // Extract track ID from "spotify:track:XXXXX" format
  const id = full.spotifyUri.split(":").pop();
  if (!id) {
    throw new Error(`Invalid Spotify URI: ${full.spotifyUri}`);
  }
  return { id };
}

/**
 * Safe parsing helpers
 */
export function parseSpotifyTrack(data: unknown): SpotifyTrack {
  return SpotifyTrackSchema.parse(data);
}

export function parseFullCardData(data: unknown): FullCardData {
  return FullCardDataSchema.parse(data);
}

/**
 * Parse track identifier from QR payload string
 */
export function parseTrackIdentifier(data: unknown): TrackIdentifier {
  // If data is a string, parse it as JSON first
  let parsed = data;
  if (typeof data === "string") {
    parsed = JSON.parse(data);
  }
  return TrackIdentifierSchema.parse(parsed);
}
