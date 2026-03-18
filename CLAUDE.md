# ChimeLine Implementation Plan for Claude

## Project Summary

**ChimeLine** is a static React + TypeScript web app for playing songs via QR codes during a timeline-based card game. Built with **React Router Framework Mode (SPA)** for file-based routing and automatic code splitting. The app has two modes:

1. **Scanner** (`/scanner`): Scan QR codes → play songs silently via hidden Spotify player
2. **Generator** (`/generator`): Create QR codes from single Spotify tracks or playlist imports

## Core Principles

- **Self-contained QR codes**: Each QR encodes full JSON (no URL embedding, no app state needed)
- **Fully static**: No backend; hosted on GitHub Pages with SPA fallback (404.html redirect)
- **React Router Framework Mode**: File-based routing, automatic code splitting, type-safe loaders/actions
- **TypeScript throughout**: Full type safety for all modules and route parameters
- **PKCE OAuth**: Spotify login without backend; tokens stored in session storage
- **SPA-ready**: `ssr: false` in react-router.config.ts builds to pure static output

## Architecture Overview

```
app/
├── root.tsx                    # Root layout, auth state, 404 fallback handler
├── routes/
│   ├── _index.tsx             # Landing / redirect to scanner
│   ├── scanner.tsx            # QR scanner page (loader checks auth)
│   ├── generator.tsx          # QR generator page (loader checks auth)
│   └── callback.tsx           # Spotify OAuth callback (loader exchanges code)
└── lib/
    ├── types.ts               # CardData, Spotify types
    ├── constants.ts           # Spotify endpoints, QR settings
    ├── spotifyAuth.ts         # PKCE OAuth (generatePKCE, exchangeCodeForToken, etc.)
    ├── spotifySearch.ts       # Track search
    ├── spotifyPlaylist.ts     # Playlist import
    ├── qrScanner.ts           # QR decoding
    └── qrGenerator.ts         # QR encoding
```

**Key Differences from Vanilla Vite Setup**:
- File-based routing: `app/routes/scanner.tsx` → `/scanner` route automatically
- Loaders: Route-level data fetching (e.g., auth checks in `loader()` functions)
- Actions: Built-in form mutations (oauth callback, logout)
- Type safety: Auto-generated `./+types/` for route params and loader data
- Automatic code splitting: Each route gets its own JS chunk
- GitHub Pages: Requires `public/404.html` redirect fallback for SPA routing

## Implementation Phases

### Phase 1: Project Scaffolding ✅ DONE

**Goal**: Initialize React Router Framework Mode project with SPA configuration

**Tasks**:
1. ✅ Run `npx create-react-router@latest .` to scaffold project
   - Auto-generates TypeScript, Vite, TailwindCSS, and file-based routing
   - Creates `app/root.tsx`, `app/routes/`, `react-router.config.ts`, `vite.config.ts`
2. ✅ Disable SSR in `react-router.config.ts`: Set `ssr: false` for SPA mode
3. ✅ Configure GitHub Pages base path in `vite.config.ts`: `base: '/chimeline/'`
   - Later: change to `base: '/'` when moving to custom domain `chimeline.prograd.no`
4. ✅ Create `.env.example` with Spotify API credentials template
5. ✅ Verify dev server: `npm run dev` → runs at `http://localhost:5173/chimeline/`

**Output**: 
- Working React Router Framework Mode SPA
- Auto-generated route structure and TypeScript config
- Ready for type definitions and service layer

---

### Phase 2: Type Definitions & Utils

**Goal**: Define TypeScript types for all data structures

**Files to create**:
- `app/lib/types.ts` — Core type definitions
- `app/lib/constants.ts` — Spotify API endpoints, QR settings

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

// Spotify API response types
interface SpotifyTrack {
  id: string;
  name: string;
  artists: Array<{ name: string }>;
  album: { name: string; release_date: string };
  uri: string;
}

interface SpotifySearchResponse {
  tracks: {
    items: SpotifyTrack[];
  };
}

interface SpotifyPlaylistTrack {
  track: SpotifyTrack;
}

interface SpotifyPlaylistResponse {
  items: SpotifyPlaylistTrack[];
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
}
```

**Constants** (`app/lib/constants.ts`):
```typescript
export const SPOTIFY_ENDPOINTS = {
  AUTHORIZE: 'https://accounts.spotify.com/authorize',
  TOKEN: 'https://accounts.spotify.com/api/token',
  SEARCH: 'https://api.spotify.com/v1/search',
  PLAYLIST: 'https://api.spotify.com/v1/playlists',
  TRACKS: 'https://api.spotify.com/v1/tracks',
} as const;

export const SPOTIFY_SCOPES = [
  'streaming',
  'user-read-email',
  'user-read-private',
] as const;

export const QR_CONFIG = {
  ERROR_CORRECTION: 'H', // High (best for durability)
  SIZE: 300, // px display size
} as const;

export const AUTH_STORAGE_KEY = 'spotify_token' as const;
```

**Verification**: Files compile cleanly with no TypeScript errors

---

### Phase 3: Spotify Auth & Services

**Goal**: Implement Spotify API communication layer

**Files to create**:
- `app/lib/spotifyAuth.ts` — PKCE OAuth flow, token management
- `app/lib/spotifySearch.ts` — Track search functionality
- `app/lib/spotifyPlaylist.ts` — Playlist import and track fetching

**spotifyAuth.ts**:
```
Function: generatePKCE()
  - Generate random codeVerifier (43-128 chars, URL-safe)
  - Create codeChallenge = base64url(sha256(codeVerifier))
  - Return { codeChallenge, codeVerifier }
  - Store codeVerifier in sessionStorage for later use

Function: getAuthUrl(codeChallenge: string, clientId: string): string
  - Build Spotify authorize URL with PKCE challenge
  - Include scopes: 'streaming user-read-email user-read-private'
  - Return full URL for redirect

Function: exchangeCodeForToken(code: string, codeVerifier: string, clientId: string): Promise<SpotifyAuthToken>
  - POST to Spotify token endpoint with code + codeVerifier
  - Use application/x-www-form-urlencoded
  - Return parsed access_token

Function: saveToken(token: SpotifyAuthToken): void
  - Store access_token in sessionStorage (auto-cleared on browser close)
  - Use AUTH_STORAGE_KEY constant

Function: getToken(): string | null
  - Retrieve access_token from sessionStorage
  - Return token or null if missing

Function: clearToken(): void
  - Remove token from sessionStorage (logout)
```

**spotifySearch.ts**:
```
Function: searchTrack(title: string, artist: string, accessToken: string): Promise<CardData[]>
  - Call Spotify /v1/search API with query `${title} ${artist}`
  - Parse response and build CardData[] from tracks
  - Extract: name, artists, album, release_date, uri
  - Return array of CardData

Function: getTrackDetails(trackId: string, accessToken: string): Promise<CardData>
  - Fetch single track from /v1/tracks/{id}
  - Build and return CardData
```

**spotifyPlaylist.ts**:
```
Function: parsePlaylistUrl(urlOrId: string): string
  - Extract playlist ID from Spotify URL (e.g., spotify:playlist:xxx)
  - Or just return the ID if already in that format
  - Return playlist ID string

Function: fetchPlaylistTracks(playlistId: string, accessToken: string): Promise<CardData[]>
  - Call /v1/playlists/{id}/tracks (handle pagination if > 50 items)
  - Parse each item.track and build CardData[]
  - Return full array of tracks from playlist

Function: searchPlaylist(query: string, accessToken: string): Promise<Array<PlaylistInfo>>
  - Call /v1/search?type=playlist with query
  - Return list of { id, name, description, imageUrl } for user to pick from
```

**Verification**: 
- Functions export cleanly without TypeScript errors
- Mock with test access tokens (test search with valid token)
- Console should show no runtime errors

---

### Phase 4: QR Services

**Goal**: Implement QR code scanning and generation

**Files to create**:
- `app/lib/qrScanner.ts` — QR decoding and validation
- `app/lib/qrGenerator.ts` — QR encoding and export

**qrScanner.ts**:
```
Function: startScanning(videoElementId: string, onScan: (data: CardData) => void): Promise<Html5Qrcode>
  - Initialize Html5Qrcode with video element ID
  - Start camera stream
  - On QR detected: call onScan with decoded CardData
  - Return scanner instance (for cleanup)

Function: stopScanning(scanner: Html5Qrcode): Promise<void>
  - Stop camera stream
  - Clean up resources

Function: decodeQRPayload(qrString: string): CardData
  - JSON.parse(qrString) → CardData
  - Validate CardData shape (all required fields present)
  - Return validated CardData or throw TypeError
```

**qrGenerator.ts**:
```
Function: generateQRCode(cardData: CardData): Promise<string>
  - Serialize CardData to JSON string
  - Use qrcode.react library to create QR code data URL
  - Return data URL (base64 PNG)

Function: generateQRCodeCanvas(cardData: CardData): Promise<Canvas>
  - Generate QR code to canvas element
  - Useful for batch rendering
  - Return canvas element

Function: downloadQRAsImage(cardData: CardData, filename?: string): void
  - Generate QR code
  - Convert to PNG blob
  - Trigger browser download with filename (default: `${cardData.title}.png`)

Function: batchGenerateQRs(cardDataArray: CardData[]): Promise<Array<{ cardId: string; qrDataUrl: string }>>
  - Generate QR for each card in batch
  - Return array of { cardId, qrDataUrl }
```

**Verification**: 
- Generate a test QR code
- Scan with phone to verify JSON parses correctly
- Test download functionality

---

### Phase 5: Route Components

**Goal**: Build React Router routes for Scanner, Generator, and OAuth callback

**Files to create**:
- `app/routes/scanner.tsx` — QR scanner route with loader
- `app/routes/generator.tsx` — QR generator route with loader
- `app/routes/callback.tsx` — Spotify OAuth callback handler (loader + minimal UI)
- `app/routes/_index.tsx` — Landing/home route (redirect or welcome)

**scanner.tsx**:
```
Route: /scanner

Loader: Route.LoaderArgs
  - Check for spotifyToken in sessionStorage
  - If missing, redirect to Spotify auth URL (spawn login flow)
  - Return { token: string }

Component Props: 
  - token: string (from loader)

UI:
  - Video feed (html5-qrcode camera stream)
  - "Start Scanning" button
  - "Stop Scanning" button
  - Hidden Spotify player (Web SDK or preview URL fallback)
  - Minimal playback controls: [ Play ] [ Pause ] [ Stop ]
  - Status feedback: "Scan successful: [track title]" (optional display)

Flow:
  1. User clicks "Start Scanning"
  2. Camera opens, html5-qrcode starts scanning
  3. QR detected → JSON decoded → CardData parsed
  4. Spotify URI loaded into player
  5. Player plays (press Play button)
```

**generator.tsx**:
```
Route: /generator

Loader: Route.LoaderArgs
  - Check for spotifyToken in sessionStorage
  - For single-track mode: token optional
  - For playlist mode: redirect to auth if missing

Component:
  - Two modes: "Single Track" / "Playlist Import" (tabs/buttons)

Mode 1: Single Track
  - Inputs: song title, artist name (text inputs)
  - Button: "Search Spotify" → calls spotifySearch.searchTrack()
  - Results: table of tracks, click to select
  - Selected: auto-fills album, release date, Spotify URI
  - Optional inputs: era, custom ID
  - Button: "Generate QR"
  - Output: QR code display, "Download as PNG", "Copy JSON"

Mode 2: Playlist Import
  - Requires spotifyToken (check in loader)
  - Input: Spotify playlist URL or ID
  - Button: "Fetch Tracks"
  - Shows: table of all tracks from playlist
  - Buttons: "Select All" / "Deselect All" (checkboxes per track)
  - Button: "Generate Selected QRs"
  - Output: Grid of QR codes (one per row, screenshot-friendly)
  - Buttons: "Download All as ZIP" (optional), "Export Selected as JSON", "Copy All JSON"
```

**callback.tsx**:
```
Route: /callback

Loader: Route.LoaderArgs
  - Extract `code` and `state` from URL query params
  - If no code: throw error
  - Retrieve codeVerifier from sessionStorage (stored during generatePKCE)
  - Call exchangeCodeForToken(code, codeVerifier, clientId) from env
  - Save token to sessionStorage
  - Redirect to /scanner (or referrer query param if available)

Component:
  - Display "Processing authentication..." or spinner
  - Auto-redirect on successful login
```

**_index.tsx**:
```
Route: / (landing page)

Option A: Redirect to /scanner
Option B: Show welcome page with description
  - Two big buttons: "Start Scanning" → /scanner, "Generate QR" → /generator
  - Short description of ChimeLine
```

**Verification**:
- Routes compile without TypeScript errors
- Loaders execute without runtime errors
- Route parameters typed correctly (check generated ./+types/ files)

---

### Phase 6: Root Layout & Navigation

**Goal**: Set up root layout with auth state and navigation

**Files to update**:
- `app/root.tsx` — Root layout component with auth state, 404 fallback, nav

**root.tsx**:
```
Component: Root (outlet)

Loader: Route.LoaderArgs
  - Check for `redirect` in sessionStorage (from GitHub Pages 404.html fallback)
  - If present: redirect to that URL
  - Otherwise: return null

Layout:
  - Header with ChimeLine title
  - Navigation tabs/buttons:
    - [ Scanner ]  [ Generator ]  [ Profile / Logout ]
  - Highlight active route
  - <Outlet /> renders child routes
  - Footer (optional)

Auth State:
  - Hold spotifyToken in React state? Or retrieve per-route from sessionStorage?
  - Pattern: Each route loader checks sessionStorage independently
  - Logout action: clears token from sessionStorage

Styling:
  - Mobile-first responsive design
  - TailwindCSS (already included in scaffold)
  - Navbar stacks vertically on small screens
  - Interactive elements >48px for touch targets
```

**Error Handling**:
- Create `app/routes/$.tsx` (catch-all route) for 404 errors
- Display "Page not found" with link back to home

**Verification**:
- Root layout renders without errors
- Navigation between routes works
- Active route highlighted correctly

---

### Phase 7: GitHub Pages & 404.html Fallback

**Goal**: Configure SPA routing for GitHub Pages

**Files to create/update**:
- `public/404.html` — GitHub Pages redirect handler
- `vite.config.ts` — Verify base path (already set to `/chimeline/`)
- `react-router.config.ts` — Verify SSR disabled (already set to false)

**public/404.html**:
```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Redirecting...</title>
  <script>
    // Store the current URL in sessionStorage
    // GitHub Pages will redirect here on 404s for SPA routes
    sessionStorage.redirect = location.href;
  </script>
  <!-- Redirect to index.html at the base path -->
  <meta http-equiv="refresh" content="0;url=/chimeline/" />
</head>
<body></body>
</html>
```

**app/root.tsx Loader Enhancement**:
```
export async function loader() {
  const redirect = typeof window !== 'undefined' 
    ? sessionStorage.getItem('redirect') 
    : null;
  if (redirect && redirect !== location.href) {
    sessionStorage.removeItem('redirect');
    return redirect;  // React Router redirect()
  }
  return null;
}
```

This pattern allows:
- User visits `/scanner` directly
- GitHub Pages serves 404 (file doesn't exist)
- 404.html redirects to `/chimeline/` and stores original URL
- React Router app loads at `/chimeline/`
- Root loader restores the redirect to `/scanner`
- User sees scanner page seamlessly

**Spotify Redirect URI**:
```
Development: http://localhost:5173/chimeline/callback
Production (GitHub Pages): https://yourusername.github.io/chimeline/callback
Custom Domain (future): https://chimeline.prograd.no/callback
  - When moving to custom domain: update vite.config.ts base to '/'
```

**Verification**:
- Build: `npm run build`
- Preview: `npm run preview`
- Test navigating to `/chimeline/scanner` directly
- Verify no console errors

---

### Phase 8: Integration Testing

**Goal**: End-to-end testing of all features

**Checklist**:
- [ ] Dev server (`npm run dev`) starts without errors
- [ ] Scanner page: Camera opens on mobile, QR scans correctly
- [ ] Generator page Single Track mode: Search works, QR generates, JSON encodes correctly
- [ ] Generator page Playlist mode: Requires login, fetches tracks, batch QR generation works
- [ ] Spotify Auth: Login flow works, token stored in sessionStorage, persists across page reloads
- [ ] Spotify Auth: Logout clears token, redirects to login prompt on protected routes
- [ ] OAuth Callback: Spotify redirect params parsed, token exchanged, redirects to scanner
- [ ] QR Scanning: Generated QRs scan correctly with phone camera
- [ ] Responsive Design: Test on mobile, tablet, desktop (UI adapts correctly)
- [ ] Build: `npm run build` produces `dist/` with no errors
- [ ] Preview: `npm run preview` runs SPA correctly
- [ ] GitHub Pages: Deployed app accessible at deployed URL, routes work without 404s

---

### Phase 9: Production Deployment & Migration Path

**Goal**: Deploy to GitHub Pages and plan for custom domain migration

**GitHub Pages Deployment**:
1. Create GitHub repository (if not already done)
2. Update Spotify app settings:
   - Redirect URI: `https://yourusername.github.io/chimeline/callback`
3. Build project: `npm run build`
4. Deploy `dist/` folder to GitHub Pages:
   - Option A: Use `gh-pages` package: `npm install -g gh-pages && gh-pages -d dist`
   - Option B: Manual: Push `dist/` contents to `gh-pages` branch
5. Verify deployment: Visit `https://yourusername.github.io/chimeline/`

**Custom Domain Migration (chimeline.prograd.no)**:
When ready to move to custom domain:
1. Add DNS records pointing to GitHub Pages
2. Add custom domain in GitHub Pages settings
3. Update `vite.config.ts`: Change `base: '/chimeline/'` → `base: '/'`
4. Update `.env.local`:
   - `VITE_SPOTIFY_REDIRECT_URI=https://chimeline.prograd.no/callback`
5. Update Spotify app settings: Redirect URI = `https://chimeline.prograd.no/callback`
6. Rebuild & redeploy: `npm run build && gh-pages -d dist`

---

## Type Definitions Glossary

```typescript
// Additional types for route data and responses
interface PlaylistInfo {
  id: string;
  name: string;
  description?: string;
  images: Array<{ url: string }>;
}

interface CardSet {
  name: string;
  description?: string;
  cards: CardData[];
}

// Route loader data types (auto-generated in ./+types/)
// These are generated by React Router and provide type safety for loaders/actions
```

---

## Common Patterns & Conventions

### QR Code Payload Format

All QR codes embed the same JSON structure (max ~2000 chars per QR code):
```json
{
  "id": "unique_card_id",
  "title": "Song Title",
  "artist": "Artist Name",
  "album": "Album Name",
  "spotifyUri": "spotify:track:6YPh5u1TRE0eN6kZ0KCfAV",
  "releaseDate": "2024-03-15",
  "era": "optional era/decade label"
}
```

**QR Code Size Guidelines**:
- Display size: 200-400px on screen (print at 100dpi for scannable output)
- Error correction: High (40% redundancy) for durability
- Encoding: Numeric data → most compact

### Spotify OAuth Flow (PKCE + CSRF Protection)

1. User clicks "Login with Spotify" button
2. App generates PKCE challenge and state: `generatePKCE()` + `generateState()`
   - codeVerifier: random 128 chars (URL-safe)
   - codeChallenge: base64url(sha256(codeVerifier))
   - state: random 64 chars for CSRF protection
   - Store both in sessionStorage
3. Redirect to Spotify authorize URL: `getAuthUrl(clientId, redirectUri)`
   - Includes code_challenge, code_challenge_method=S256, and state
   - Spotify shows login/permission prompt
4. Spotify redirects back to `/callback?code=xxx&state=yyy`
5. Callback component extracts code + state:
   - Validates state matches sessionStorage (CSRF protection)
   - `exchangeCodeForToken(code, state, clientId, redirectUri)`
   - POST to Spotify token endpoint with code + codeVerifier
   - Returns access_token
6. Fetch user profile from Spotify API (`/v1/me` endpoint)
   - Extract display_name, email, id
   - Save to sessionStorage for instant display
7. Save token: sessionStorage.setItem('spotify_token', token)
8. Token auto-clears on browser close (sessionStorage not localStorage)
9. Redirect to home with no error flash (silent success)
10. User can logout via button which clears token + user profile

### File-Based Routing

React Router Framework Mode uses file paths in `app/routes/` to define routes:

| File Path | Route | Notes |
|-----------|-------|-------|
| `_index.tsx` | `/` | Home / landing page |
| `scanner.tsx` | `/scanner` | QR scanner |
| `generator.tsx` | `/generator` | QR generator |
| `callback.tsx` | `/callback` | Spotify OAuth callback |
| `$.tsx` | `404` | Catch-all for undefined routes |
| `_layout.tsx` | Layout wrapper | Pathless layout (optional) |

### Loader Pattern

All loaders follow this pattern for auth checking:

```typescript
import { redirect } from '@react-router/node';
import type { Route } from './+types/scanner';

export async function loader({ request }: Route.LoaderArgs) {
  const token = typeof window !== 'undefined'
    ? sessionStorage.getItem('spotify_token')
    : null;
  
  if (!token) {
    const codeChallenge = generatePKCE().codeChallenge;
    sessionStorage.setItem('pkce_challenge', codeChallenge);
    return redirect(getAuthUrl(codeChallenge, clientId));
  }
  
  return { token };
}
```

### Error Handling Strategy

- **API errors**: Catch fetch errors, show toast/alert to user
- **Validation**: Validate CardData structure before use
- **Auth errors**: Redirect to login on 401/403
- **QR errors**: Invalid JSON → show "Scan failed, try again"
- **Console logging**: Debug without exposing to user

---

## Development Workflow

### Running Locally

```bash
# Install dependencies
npm install

# Create .env.local (copy from .env.example)
cp .env.example .env.local
# Edit with your Spotify Client ID and matching redirect URI

# Start dev server
npm run dev
# Opens http://localhost:5173/chimeline/

# During development:
# - Hot Module Replacement (HMR) enabled
# - TypeScript errors shown in browser + console
# - Routes auto-refresh as you edit
```

### Building for Production

```bash
# Create optimized build
npm run build
# Output: dist/

# Preview production build locally
npm run preview
# Opens http://localhost:4173/chimeline/ (simulates GitHub Pages)

# Deploy to GitHub Pages
gh-pages -d dist  # or manual upload of dist/ contents
```

### Testing Routes

```bash
# Test OAuth flow locally:
1. Go to http://localhost:5173/chimeline/generator
2. Click "Login with Spotify"
3. Should redirect to Spotify authorize page
4. Grant permissions
5. Redirected to callback → exchanges code for token
6. Redirects back to /generator with token

# Test QR scanning:
1. Generate a QR code on /generator
2. Open phone camera or QR scanner app
3. Scan generated QR
4. Should navigate to /scanner with CardData loaded
```

---

## Tech Stack Summary

| Layer | Technology | Notes |
|-------|-----------|-------|
| **Framework** | React Router | Framework Mode v7.13.1 (SPA, ssr: false) |
| **Language** | TypeScript | Full type safety |
| **Build Tool** | Vite | Fast HMR, optimized build |
| **Styling** | CSS Modules | Scoped styling, no framework |
| **QR Scanning** | html5-qrcode | Camera-based QR decoding (pending) |
| **QR Generation** | qrcode.react | React component for QR codes (pending) |
| **File-based Routing** | @react-router/fs-routes | Auto-discovered routes from app/routes/ |
| **Auth** | Spotify Web API (PKCE) | No backend required, state parameter for CSRF |
| **Hosting** | GitHub Pages | Static SPA with 404.html fallback |

---

## Troubleshooting

### "Cannot find module '@react-router/dev'"
- Run `npm install` to ensure all dependencies installed
- Delete `node_modules/` and `package-lock.json`, re-run `npm install`

### "localhost:5173 is blank / 404"
- Check that `npm run dev` output shows `http://localhost:5173/chimeline/`
- Base path in `vite.config.ts` should match your intended deployment URL
- Verify React Router scaffold created `app/routes/home.tsx` or `_index.tsx`

### "Spotify login redirect loop"
- Check that Spotify Redirect URI in app settings exactly matches your deployment URL
- For local dev: `http://localhost:5173/chimeline/callback`
- For GitHub Pages: `https://yourusername.github.io/chimeline/callback`
- Ensure `callback.tsx` route exists and loader parses `code` param correctly

### "QR codes not scanning"
- Test with multiple QR scanner apps (built-in camera app, third-party)
- Ensure QR size is reasonable (200-400px on screen)
- High error correction enabled (should be: QR_ERROR_CORRECTION = 'H')
- If still failing: Check that JSON is valid (paste cardData JSON in browser console)

---

## Future Enhancements (Post-MVP)

- **PDF Generation**: Use jsPDF + html2canvas for double-sided card printing
- **Card Set Management**: Save/load card sets in IndexedDB or localStorage
- **Offline Mode**: Cache Spotify metadata for scanning without internet
- **Batch QR Export**: Generate all QRs as ZIP or PDF booklet
- **Game Scoring**: Export game results (timeline score, card placements)
- **Dark Mode**: Toggle theme preference
- **Custom Branding**: Configurable colors, logo placement in generated PDFs
- **Analytics**: Track popular playlists, most-scanned songs (privacy-first)

---

## Project Status & Notes

**Current Phase**: QR Scanner & Generator Complete ✅ (`Phase 4-6` finished)
- [x] Phase 1: Project Scaffolding (React Router Framework Mode + SPA config)
- [x] Phase 2: File-based routing working with `@react-router/fs-routes` + `flatRoutes()`
- [x] Phase 3: Spotify PKCE OAuth with state parameter (CSRF protection)
- [x] Phase 4: QR Services ✅ COMPLETED THIS SESSION
  - ✅ `app/lib/qrGenerator.ts` — QR code generation with minimal 4-field payload (u, t, a, d)
  - ✅ `app/lib/qrScanner.ts` — QR decoding via html5-qrcode + camera integration
  - ✅ Payload optimization: ~50% size reduction vs full JSON
  - ✅ Fixed JSON parsing for both string and object QR payloads
- [x] Phase 5: Scanner Route ✅ COMPLETED THIS SESSION
  - ✅ `app/routes/scanner.tsx` — Live camera QR scanning with playback controls
  - ✅ `app/routes/scanner.module.css` — Mobile-friendly responsive UI
  - ✅ Spotify REST API playback (requires active Spotify device)
  - ✅ Auto-play on QR scan, manual play/pause/stop controls
  - ✅ Track metadata display (for debugging, removes later)
  - ✅ Working on mobile via ngrok
- [x] Phase 6: Generator Route ✅ COMPLETED THIS SESSION
  - ✅ `app/routes/generator.tsx` — Single-track QR generator
  - ✅ `app/routes/generator.module.css` — Form UI with QR display & download
  - ✅ Spotify track fetching & URL/URI/ID parsing
  - ✅ Download QR as PNG functionality
  - ✅ JSON payload preview for debugging
- [ ] Phase 7: Spotify Search & Playlist (batch generation) — next priority
- [ ] Phase 8: Root Layout & Navigation with route guards
- [ ] Phase 9: GitHub Pages 404.html Fallback
- [ ] Phase 10: Integration Testing & Deployment

**Key Decisions Made This Session**:
- ✅ Switched from npm to pnpm for better peer dependency resolution
- ✅ qrcode library (pure JS) instead of qrcode.react wrapper — more control
- ✅ html5-qrcode for camera scanning — clean API, good mobile support
- ✅ Minimal QR payload with single-letter keys — production-ready size
- ✅ Zod validation for all Spotify API responses — runtime type safety
- ✅ REST API fallback for playback — Web Playback SDK (known issue below)
- ✅ CSS Modules only — no Tailwind, scoped styling

**Completed Features** (This Session):
- ✅ QR code generation with minimal 4-field payload (u=uri, t=title, a=artist, d=releaseDate)
- ✅ QR code scanning via camera (html5-qrcode)
- ✅ Single-track QR generator with download
- ✅ Scanner with play/pause/stop controls
- ✅ Spotify REST API playback (auto-plays when track scanned)
- ✅ Track metadata display (useful debugging feature)
- ✅ Mobile-friendly responsive UI (desktop + phone via ngrok)
- ✅ Spotify track fetching with URL/URI/ID parsing
- ✅ JSON payload inspection in UI
- ✅ Removed redundant types.ts (all types in schemas.ts with Zod)
- ✅ Fixed route discovery to ignore CSS modules
- ✅ Improved SQL parsing for JSON string payloads

**Known Issues**:
- ❌ **Spotify Web Playback SDK not connecting** — `ready` event never fires
  - Workaround: Use REST API playback (requires Spotify app running on a device)
  - Investigate: CORS issue? Token scope? Browser policy?
  - Impact: Users must have Spotify app open; can't play in browser without it
- Route auth guards not yet implemented (anyone can access /scanner, /generator)
- Metadata displays in scanner (game-spoiling; remove in final version)
- Batch QR generation not yet implemented
- Spotify search not yet implemented

**Development Tips**:
- `pnpm dev` to start dev server (auto-reload on file changes)
- Desktop: Full playback works if Spotify app is open
- Mobile via ngrok: Works in private mode (fresh session storage)
- Console has debug logging for QR parsing and player initialization
- pnpm cleaner than npm for React Router projects; peer deps resolved automatically

**Next Steps** (Prioritized):
1. **Fix Web Playback SDK** (investigate why ready event doesn't fire)
2. **Batch QR generation** from playlists (upload file or paste playlist URL)
3. **Spotify search integration** (find tracks by title/artist)
4. **Remove metadata display** from scanner (game production release)
5. **Route auth guards** (require login for /scanner, /generator)
6. **GitHub Pages deployment** with 404.html fallback
7. **PDF export** for printable QR booklets (future enhancement)

---

**Last Updated**: March 18, 2026 (Session completed - QR generator & scanner working)  
**Status**: 
- ✅ QR generation & scanning fully functional
- ✅ Spotify playback working via REST API (requires app running)
- ⚠️ Web Playback SDK needs debugging
- 🚀 Ready for batch generation & search integration
