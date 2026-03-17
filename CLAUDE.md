# ChimeLine Implementation Plan for Claude

## Project Summary

**ChimeLine** is a static React + TypeScript web app for playing songs via QR codes during a timeline-based card game. The app has two modes:

1. **Scanner**: Scan QR codes → play songs silently via hidden Spotify player
2. **Generator**: Create QR codes from single Spotify tracks or playlist imports

## Core Principles

- **Self-contained QR codes**: Each QR encodes full JSON (no URL embedding, no app state needed)
- **Fully static**: No backend; hosted on GitHub Pages
- **Lightweight**: Minimal dependencies; vanilla React components
- **TypeScript throughout**: Full type safety for all modules
- **PKCE OAuth**: Spotify login without backend; tokens stored in session storage

## Architecture Overview

```
┌─────────────────────────┐
│      App.tsx (root)     │
│   - Tab switching       │
│   - Spotify auth holder │
└────────┬────────────────┘
         │
    ┌────┴────┐
    ▼         ▼
┌────────┐ ┌──────────┐
│Scanner │ │Generator │
│ .tsx   │ │  .tsx    │
└────┬───┘ └────┬─────┘
     │          │
     └──────┬───┘
            │
    ┌───────┴──────────┐
    │    Services      │
    │   (spotifyAuth   │
    │   spotifySearch  │
    │   spotifyPlaylist│
    │   qrScanner      │
    │   qrGenerator)   │
    └─────────────────┘
```

## Implementation Phases

### Phase 1: Project Setup

**Goal**: Scaffold Vite + React + TypeScript project with all dependencies

**Tasks**:
1. Run `npm create vite@latest chimeline -- --template react`
2. Switch to TypeScript template: `npm install` (with generated `tsconfig.json`)
3. Install dependencies:
   ```
   npm install html5-qrcode qrcode.react axios
   npm install -D @types/react @types/react-dom
   ```
4. Configure GitHub Pages:
   - Update `vite.config.ts`: `base: '/chimeline/'` (adjust for your repo)
   - Add build script: `"build": "tsc && vite build"`
   - Add deploy script (optional): `"deploy": "npm run build && gh-pages -d dist"`
5. Create `.env.example`:
   ```
   VITE_SPOTIFY_CLIENT_ID=your_client_id
   VITE_SPOTIFY_REDIRECT_URI=http://localhost:5173/callback
   ```
6. Create `public/index.html` callback handler

**Output**: Working Vite dev server (`npm run dev`)

---

### Phase 2: Type Definitions & Utils

**Goal**: Define TypeScript types for all data structures

**Files**:
- `src/utils/types.ts` — Core type definitions
- `src/utils/constants.ts` — Spotify API endpoints, auth constants

**Types to define**:
```typescript
// CardData: The JSON payload embedded in each QR code
interface CardData {
  id: string;
  title: string;
  artist: string;
  album: string;
  spotifyUri: string;
  releaseDate: string; // ISO 8601
  era?: string;
}

// Spotify API types
interface SpotifySearchResult {
  tracks: {
    items: Array<{
      id: string;
      name: string;
      artists: Array<{ name: string }>;
      album: { name: string; release_date: string };
      uri: string;
    }>;
  };
}

interface SpotifyPlaylistResponse {
  items: Array<{
    track: {
      id: string;
      name: string;
      artists: Array<{ name: string }>;
      album: { name: string; release_date: string };
      uri: string;
    };
  }>;
  next?: string; // For pagination
}

// PKCE state
interface PKCEState {
  codeChallenge: string;
  codeVerifier: string;
}

interface SpotifyAuthToken {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
}
```

**Constants**:
```typescript
const SPOTIFY_ENDPOINTS = {
  AUTHORIZE: 'https://accounts.spotify.com/authorize',
  TOKEN: 'https://accounts.spotify.com/api/token',
  SEARCH: 'https://api.spotify.com/v1/search',
  PLAYLIST: 'https://api.spotify.com/v1/playlists',
};

const QR_ERROR_CORRECTION = 'H'; // High (best for durability)
const QR_SIZE = 300; // px
```

**Verification**: No runtime yet; types compile cleanly

---

### Phase 3: Spotify Services

**Goal**: Implement Spotify API communication (auth, search, playlist fetching)

**Files**:
- `src/services/spotifyAuth.ts` — PKCE OAuth flow
- `src/services/spotifySearch.ts` — Track search
- `src/services/spotifyPlaylist.ts` — Playlist imports

**spotifyAuth.ts**:
```
Function: generatePKCE()
  - Generate random codeVerifier (43-128 chars)
  - Create codeChallenge = base64url(sha256(codeVerifier))
  - Return { codeChallenge, codeVerifier }

Function: getAuthUrl(codeChallenge, redirectUri, clientId)
  - Build Spotify authorize URL with PKCE params
  - Return full authorization URL

Function: exchangeCodeForToken(code, codeVerifier, clientId, redirectUri)
  - POST to Spotify token endpoint with code + codeVerifier
  - Return access_token

Function: saveToken(token)
  - Store access_token in sessionStorage (auto-cleared on browser close)

Function: getToken()
  - Retrieve access_token from sessionStorage
  - Return or null if expired/missing

Function: clearToken()
  - Remove token from sessionStorage (logout)
```

**spotifySearch.ts**:
```
Function: searchTrack(title, artist, accessToken)
  - Call /v1/search?type=track&q={title}%20{artist}
  - Return array of SpotifySearchResult.tracks.items
  - Build CardData from result (extract releaseDate, spotifyUri, etc.)

Function: getTrackDetails(trackId, accessToken)
  - Fetch single track details from /v1/tracks/{id}
  - Return CardData
```

**spotifyPlaylist.ts**:
```
Function: parsePlaylistUrl(url)
  - Extract playlist ID from Spotify URL or just return the ID itself
  - Return playlist ID as string

Function: fetchPlaylistTracks(playlistId, accessToken)
  - Call /v1/playlists/{id}/tracks (paginate if > 50 items)
  - Extract each track and build CardData[]
  - Return array of CardData

Function: searchPlaylist(query, accessToken)
  - Call /v1/search?type=playlist&q={query}
  - Return list of playlists (user picks one)
```

**Verification**: Mock with test access tokens (optional); ensure no errors in console

---

### Phase 4: QR Services

**Goal**: Implement QR code scanning and generation

**Files**:
- `src/services/qrScanner.ts` — QR decoding
- `src/services/qrGenerator.ts` — QR encoding

**qrScanner.ts**:
```
Function: startScanning(videoElementId, onScan)
  - Initialize Html5Qrcode with video element
  - Start camera
  - onScan callback receives decoded QR string
  - Parse JSON to CardData
  - Return { start, stop, isScanning }

Function: stopScanning(scanner)
  - Stop camera and cleanup

Function: decodeQRPayload(qrString)
  - JSON.parse(qrString) → CardData
  - Validate CardData shape (all required fields present)
  - Return CardData or throw error
```

**qrGenerator.ts**:
```
Function: generateQRCode(cardData)
  - Serialize CardData to JSON string
  - Use QRCode library to create QR code image
  - Return data URL / canvas element

Function: downloadQRAsImage(cardData, filename)
  - Generate QR → convert to PNG blob
  - Trigger browser download

Function: batchGenerateQRs(cardDataArray)
  - Generate QR for each card
  - Return array of { cardId, qrDataUrl }
```

**Verification**: Scan generated QR with phone; ensure JSON parses correctly

---

### Phase 5: React Components

**Goal**: Build UI components for Scanner and Generator

**Files**:
- `src/components/Scanner.tsx` — QR scanning + hidden player
- `src/components/Generator.tsx` — Single track + playlist import
- `src/App.tsx` — Root, tabs, auth state

**Scanner.tsx**:
```
Component: Scanner
  Props: { spotifyToken: string }

  UI:
  - Video feed (html5-qrcode camera)
  - "Start Scanning" button (triggers camera)
  - "Stop Scanning" button
  - Hidden Spotify player iframe (controlled by play/pause)
  - Minimal controls: [ Play ] [ Pause ] [ Stop ]
  - Feedback: "Scan successful" message (no track title shown)

  Flow:
  1. Click "Start Scanning"
  2. Camera opens, html5-qrcode streams
  3. User points phone at printed/screen QR
  4. QR decoded → CardData parsed
  5. Spotify URI loaded into player
  6. Player visible (minimal UI only)
  7. User clicks Play
```

**Generator.tsx**:
```
Component: Generator (with tabs/modes)
  Props: { spotifyToken?: string }

  Mode 1: Single Track
  - Input: title, artist (manual entry)
  - Button: "Search Spotify" → calls spotifySearch
  - Results: list of tracks, user clicks to select
  - Selected track → auto-fill Spotify URI, album, release date
  - Optional: Manual entry for releaseDate, era
  - Button: "Generate QR"
  - Output: QR code display + "Download QR" + "Copy JSON"

  Mode 2: Playlist Import
  - Requires spotifyToken (show login prompt if not authenticated)
  - Input: Spotify playlist URL / ID
  - Button: "Fetch Tracks"
  - Shows: List of tracks from playlist
  - Button: "Generate All QRs"
  - Output: Grid of QR codes (screenshot-friendly layout)
  - Buttons: "Download All as ZIP" (optional), "Export as JSON"

  Tab switching: Buttons to select Mode 1 or Mode 2
```

**App.tsx**:
```
Component: App (root)

  State:
  - spotifyToken (retrieved from sessionStorage)
  - isAuthenticated (boolean)
  - currentTab ('scanner' | 'generator')

  Flow:
  1. On mount: check sessionStorage for spotifyToken
  2. If URL contains callback params (auth code): exchange for token
  3. Show tabs: [ Scanner ] [ Generator ] [ Logout ]
  4. Render selected component

  Logout:
  - Clear token from sessionStorage
  - Redirect to Scanner tab

  Styling:
  - Simple tab navigation
  - Mobile-first: buttons stack vertically on small screens
  - Camera and drag targets >48px for touch
```

**Verification**: Click between tabs; logout clears token; Scanner camera opens on mobile

---

### Phase 6: Spotify Web Playback Integration

**Goal**: Setup Spotify Web Playback SDK for audio playback

**Note**: Web Playback SDK requires Spotify Premium account to play full tracks.

**Implementation**:
- Load SDK in HTML: `<script src="https://sdk.scdn.co/spotify-player.js"></script>`
- Initialize player in `Scanner.tsx` or a dedicated service
- Play via `player.play()` with track URI
- Show minimal controls (play/pause button only)

**Files**:
- `src/services/spotifyPlayer.ts` — Player initialization and control

**spotifyPlayer.ts**:
```
Function: initializePlayer(accessToken, onPlayerReady)
  - Load Spotify Web SDK
  - Initialize player with access token
  - Return player instance

Function: playTrack(player, spotifyUri)
  - Call player.play({ uris: [spotifyUri] })

Function: togglePlayPause(player)
  - Check current state; play or pause

Function: stopPlayback(player)
  - Stop current track
```

**Verification**: 
- Premium account required to test
- Non-premium: show preview URL or error message
- Check browser console for SDK errors

---

### Phase 7: Environment Setup & GitHub Pages Config

**Goal**: Configure app for deployment to GitHub Pages

**Files**:
- `vite.config.ts` — Base path, build config
- `.env.example` — Template
- `public/index.html` — Redirect handler for OAuth callback

**vite.config.ts**:
```typescript
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  base: '/chimeline/', // Adjust to your repo name
  server: {
    port: 5173,
  },
  build: {
    outDir: 'dist',
    sourcemap: false, // Set to true for debugging in prod
  },
});
```

**public/index.html**:
```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <link rel="icon" type="image/svg+xml" href="/vite.svg" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>ChimeLine</title>
</head>
<body>
  <div id="root"></div>
  <script type="module" src="/src/main.tsx"></script>
</body>
</html>
```

**Deployment**:
1. `npm run build` → creates `dist/` folder
2. Push `dist/` to GitHub Pages (via `gh-pages` package or manual upload)
3. Ensure Spotify redirect URI in app settings matches deployed URL

---

### Phase 8: Testing & Refinement

**Goal**: Manual testing of all features

**Checklist**:
- [ ] Vite dev server runs without errors
- [ ] Scanner tab opens camera on mobile
- [ ] QR scanning decodes JSON correctly
- [ ] Spotify playback initializes (Premium account)
- [ ] Generator search returns results
- [ ] Single-track QR generates and encodes JSON
- [ ] Playlist import fetches tracks
- [ ] Batch QR generation works
- [ ] Export to JSON contains all card data
- [ ] Responsive design: test on phone/tablet/desktop
- [ ] GitHub Pages deployment works (full URL accessible)
- [ ] QR codes from grid are scannable

---

## Type Definitions Glossary

```typescript
// Request/Response wrapper
interface ApiResponse<T> {
  data: T;
  error?: string;
}

// User authorization
interface AuthState {
  isAuthenticated: boolean;
  token?: string;
  expiresAt?: number;
}

// Playlist metadata
interface PlaylistInfo {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
}

// Card set (collection of cards for export)
interface CardSet {
  name: string;
  description?: string;
  cards: CardData[];
}
```

---

## Common Patterns

### QR Code Payload

All QR codes encode the same JSON structure:
```json
{
  "id": "unique_card_id",
  "title": "Song Title",
  "artist": "Artist Name",
  "album": "Album Name",
  "spotifyUri": "spotify:track:...",
  "releaseDate": "YYYY-MM-DD",
  "era": "optional era label"
}
```

### Spotify OAuth Flow (PKCE)

1. User clicks "Login with Spotify"
2. Generate PKCE challenge (codeVerifier + codeChallenge)
3. Redirect to Spotify authorize URL with codeChallenge
4. Spotify redirects back to app with `code` parameter
5. Exchange `code` + `codeVerifier` for access_token
6. Store token in sessionStorage
7. Token auto-clears on browser close

### Error Handling

- Wrap all async calls in try/catch
- Show user-friendly error messages (e.g., "Failed to fetch tracks")
- Log errors to console for debugging
- Validate CardData shape before using

---

## Future Enhancements (Post-MVP)

- **PDF Generation**: Use jsPDF + html2canvas for double-sided card printing
- **Card Set Management**: Save/load card sets in IndexedDB or localStorage
- **Offline Mode**: Cache Spotify metadata for scanning without connection
- **Share Scores**: Export game results (timeline placements + scores)
- **Playlist Editor**: Reorder, filter, or edit tracks before QR generation
- **Theme Support**: Dark mode, custom colors, branded templates

---

## Notes for Developers

- **No backend**: All state is client-side and ephemeral (sessionStorage)
- **Spotify API Rate Limits**: ~180 requests per 15 minutes per IP; refresh tokens not used (session-based)
- **QR Code Size**: Aim for 200-400px display size; test scanning at arm's length distance
- **Mobile Camera**: Requires HTTPS (even on localhost with special exceptions); test on real device when possible
- **Accessibility**: Ensure play/pause buttons are keyboard-accessible; provide alt text for camera views

---

## Setup Checklist

Before starting implementation:

- [ ] Create Spotify Developer App at https://developer.spotify.com/dashboard
- [ ] Note Client ID and Redirect URI
- [ ] Create `.env.local` with Client ID
- [ ] Verify Node.js version (v16+)
- [ ] Clone/initialize git repo
- [ ] Run `npm install`
- [ ] Run `npm run dev` to verify Vite server starts
- [ ] Plan GitHub Pages deployment strategy

---

**Last Updated**: March 17, 2026  
**Status**: Ready for Phase 1 implementation
