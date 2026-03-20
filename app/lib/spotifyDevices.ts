/**
 * Spotify device management
 * Fetch available playback devices and manage device selection
 */

import { getToken } from "./spotifyAuth";

export interface SpotifyDevice {
  id: string;
  name: string;
  type: string;
  is_active: boolean;
  is_private_session: boolean;
  is_restricted: boolean;
  volume_percent: number;
}

const DEVICE_STORAGE_KEY = "chimeline_selected_device";

/**
 * Fetch all available Spotify devices
 */
export async function fetchAvailableDevices(token: string): Promise<SpotifyDevice[]> {
  const response = await fetch("https://api.spotify.com/v1/me/player/devices", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const errorMsg = errorData.error?.message || response.statusText;
    throw new Error(`Failed to fetch devices: ${errorMsg}`);
  }

  const data = await response.json();
  return data.devices || [];
}

/**
 * Store selected device ID in localStorage
 */
export function saveSelectedDeviceId(deviceId: string): void {
  localStorage.setItem(DEVICE_STORAGE_KEY, deviceId);
}

/**
 * Retrieve stored device ID from localStorage
 */
export function getSelectedDeviceId(): string | null {
  return localStorage.getItem(DEVICE_STORAGE_KEY);
}

/**
 * Clear stored device ID (for logout/reset)
 */
export function clearSelectedDeviceId(): void {
  localStorage.removeItem(DEVICE_STORAGE_KEY);
}

/**
 * Build Spotify URI for opening a track in the app
 * Used for device setup/activation
 */
export function buildSpotifyTrackUri(trackId: string): string {
  return `spotify:track:${trackId}`;
}

/**
 * The silence song - John Cage's 4'33"
 * Perfect for device setup (silent, doesn't spoil gameplay)
 */
export const SILENCE_TRACK_ID = "2bNCdW4rLnCTzgqUXTTDO1";
