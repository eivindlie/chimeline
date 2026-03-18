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
 * Minimal CardData - compact format for QR codes (single-letter keys)
 * u: spotifyUri (required for playback)
 * t: title (required for display)
 * a: artist (required for display)
 * d: releaseDate (required for game mechanics)
 */
export const MinimalCardDataSchema = z.object({
  u: z.string(), // spotifyUri
  t: z.string(), // title
  a: z.string(), // artist
  d: z.string(), // releaseDate (YYYY-MM-DD)
});

export type MinimalCardData = z.infer<typeof MinimalCardDataSchema>;

// Type alias for backwards compatibility in components
export type CardData = FullCardData;

/**
 * Convert full CardData to minimal format for QR encoding
 */
export function toMinimalCardData(full: FullCardData): MinimalCardData {
  return {
    u: full.spotifyUri,
    t: full.title,
    a: full.artist,
    d: full.releaseDate,
  };
}

/**
 * Convert minimal CardData back to full format (for scanner)
 */
export function toFullCardData(minimal: MinimalCardData): FullCardData {
  return {
    spotifyUri: minimal.u,
    title: minimal.t,
    artist: minimal.a,
    releaseDate: minimal.d,
  };
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

export function parseMinimalCardData(data: unknown): MinimalCardData {
  return MinimalCardDataSchema.parse(data);
}
