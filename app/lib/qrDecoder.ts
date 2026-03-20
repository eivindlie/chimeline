import { parseTrackIdentifier, type TrackIdentifier } from "./schemas";

/**
 * Parse QR code payload and extract track ID
 * Handles both JSON and plain string formats
 */
export function decodeQRPayload(qrString: string): string {
  try {
    const payload = parseTrackIdentifier(qrString);
    console.debug("Decoded track ID:", payload.id);
    return payload.id;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error("Failed to decode QR payload:", errorMsg);
    throw new Error(`Invalid QR code format: ${errorMsg}`);
  }
}
