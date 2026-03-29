/**
 * Virtual pause state management
 * 
 * Since mobile devices disappear when playback stops, we simulate pause by:
 * - Setting volume very low (1%, not 0 to avoid iOS sleep)
 * - Storing the position
 * - Never calling the pause endpoint
 * 
 * Playback always continues in the background with repeat=track
 */

export interface VirtualPauseState {
  isPaused: boolean;
  storedPosition: number; // milliseconds
  trackUri: string;
}

export function createVirtualPauseState(): VirtualPauseState {
  return {
    isPaused: false,
    storedPosition: 0,
    trackUri: "",
  };
}

/**
 * Store virtual pause state in sessionStorage
 */
export function saveVirtualPauseState(state: VirtualPauseState): void {
  sessionStorage.setItem("chimeline_virtual_pause", JSON.stringify(state));
}

/**
 * Retrieve virtual pause state from sessionStorage
 */
export function getVirtualPauseState(): VirtualPauseState {
  const stored = sessionStorage.getItem("chimeline_virtual_pause");
  return stored ? JSON.parse(stored) : createVirtualPauseState();
}

/**
 * Clear virtual pause state
 */
export function clearVirtualPauseState(): void {
  sessionStorage.removeItem("chimeline_virtual_pause");
}
