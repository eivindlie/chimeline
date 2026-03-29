# ChimeLine — Claude Context

> Keep this file up to date. Update **Next Priorities** and **Known Limitations** as part of any commit that changes them.

## What It Is

**ChimeLine** is a static React + TypeScript PWA for playing songs via QR codes during a timeline-based card game. Players scan QR codes to hear a song, then place cards on a timeline based on release year.

Two modes:
- **Scanner** (`/scanner`): Scan QR codes → auto-play song on Spotify
- **Generator** (`/generator`): Create QR codes from Spotify tracks or playlists, export as double-sided PDF

Hosted at `chimeline.prograd.no`. No backend — fully static, GitHub Pages + GitHub Actions CI/CD.

---

## Architecture

```
app/
├── root.tsx                        # Root layout, update banner, error boundary
├── globals.d.ts                    # __BUILD_HASH__ global declaration
├── routes/
│   ├── _index.tsx                  # Home — routes desktop→/scanner, mobile→/setup
│   ├── scanner.tsx                 # QR scanner + Spotify playback
│   ├── generator.tsx               # QR generator + PDF export
│   ├── setup.tsx                   # First-time device setup
│   ├── callback.tsx                # Spotify OAuth callback
│   └── devices.tsx                 # Debug page — logout, device info
└── lib/
    ├── schemas.ts                  # Zod schemas for all API responses + CardData
    ├── spotifyAuth.ts              # PKCE OAuth, token storage (sessionStorage)
    ├── spotifyPlayback.ts          # playTrack, pausePlayback, resumePlayback, etc.
    ├── spotifyDevices.ts           # Device management, SETUP_TRACK_ID
    ├── spotifySearch.ts            # Track search + playlist fetching
    ├── spotifyPlaylist.ts          # Playlist fetching with pagination
    ├── virtualPause.ts             # VirtualPauseState type + sessionStorage helpers
    ├── virtualPausePlayback.ts     # Virtual pause/resume via 4'33'' track switch
    ├── qrGenerator.ts              # QR encoding (minimal payload)
    ├── qrScanner.ts                # Promise-based QR decoding via html5-qrcode
    ├── qrDecoder.ts                # Parse QR payload → extract track ID
    ├── trackMetadata.ts            # Fetch full track metadata from Spotify API
    ├── pdfCardGenerator.ts         # Double-sided A4 PDF via pdfmake
    ├── generateQRFromTrackUrl.ts   # Unified: URL/URI/ID → QR data URL
    ├── useAuthRedirect.ts          # Hook: check auth, redirect to login if needed
    ├── useSpotifyPlayer.ts         # Hook: Web Playback SDK init + state
    ├── useServiceWorkerUpdate.ts   # Hook: detect new version, show update banner
    └── design-tokens.css           # 40+ CSS custom properties (colors, spacing, etc.)
```

**Tech stack**: React Router v7 (SPA, `ssr: false`), TypeScript, Vite, CSS Modules, pnpm

**i18n**: `react-i18next` with Norwegian (`nb`) as default, English (`en`) via switcher on home page. Translation files in `app/locales/`. Language persists to `localStorage`. Type-safe: `t()` calls checked against `en.json` shape at build time.

---

## Key Patterns

### QR Payload
QR codes encode only the Spotify track ID — minimal size. On scan, full metadata is fetched from Spotify:
```json
{ "u": "spotify:track:6YPh5u1TRE0eN6kZ0KCfAV" }
```
`qrDecoder.ts` parses the payload → `trackMetadata.ts` fetches title/artist/album/releaseDate.

### Spotify Auth (PKCE)
No backend. Full PKCE flow with CSRF state parameter. Token stored in `sessionStorage` (auto-cleared on browser close). OAuth redirect path preserved in `localStorage` so users land back where they started.

### Platform-Aware Playback

| Platform | Playback method | Device ID source |
|----------|----------------|-----------------|
| Desktop  | Web Playback SDK | `useSpotifyPlayer` hook (`ready` event) |
| Mobile   | REST API only | Saved in `localStorage` during setup |

Desktop skips setup entirely. Scanner shows a "Connecting to Spotify..." spinner while SDK initializes — only reveals "Start Scanning" once `playerReady` is true (guarantees `deviceId` is available).

### Virtual Pause
Never call the Spotify pause endpoint — mobile devices drop off after ~10 seconds of pause.

Instead:
1. **Pause**: store current position + track URI, switch playback to John Cage's *4'33''* (`spotify:track:2bNCdW4rLnCTzgqUXTTDO1`) with repeat=track. Device stays active, completely silent.
2. **Resume**: switch back to original track URI, wait 300ms, seek to stored position.
3. **Scan next**: new `playTrack` call automatically overwrites 4'33''; `restoreVolume()` just clears the stored state.

*Fun fact: when you press pause, you're actually playing John Cage's 4'33''.*

### PDF Card Generator
`pdfCardGenerator.ts` generates double-sided A4 PDFs via pdfmake:
- 3×4 grid, 65×65mm cards, 12 per page
- QR side: 140×140pt QR code centered
- Title side: title (11pt bold), date (8pt, Norwegian format), year (32pt bold), artist (8pt)
- Column reversal on title pages for correct long-edge duplex flip

### Service Worker / Update Detection
Build hash baked into bundle via `vite.config.ts` `define: { __BUILD_HASH__ }` (from git SHA). On load, `useServiceWorkerUpdate` compares the bundle's `__BUILD_HASH__` against the server's `version.json`. Mismatch → update banner appears.

---

## Routing

| Route | Description |
|-------|-------------|
| `/` | Home — platform-aware redirect |
| `/scanner` | QR scanner + playback |
| `/generator` | QR generator + PDF export |
| `/setup` | First-time Spotify device setup |
| `/callback` | Spotify OAuth callback |
| `/devices` | Debug: logout, device info |

---

## Physical Distribution

The game is distributed in **ziplock bags** (10×15cm bags fit both the 65×65mm card deck and an A6 instruction insert):

- **One bag per QR series** — contains the card deck + an instruction insert (cut from the A4 instruction sheet PDF)
- **One shared bag for bonus cards** — a full set of bonus cards (from the bonus cards PDF) + an instruction insert

**Design goal**: any bag can be picked up cold by an uninitiated player at a game table and self-explain. The instruction insert therefore opens with "make sure to have a set of bonus cards and at least one set of QR cards" so a player holding either bag knows what else to find.

**PDFs generated by `/generator`:**
- `chimeline-instructions.pdf` — A4, 2×2 grid of instruction cards; Norwegian front / English back; print duplex, cut to get 4 A6 inserts
- Bonus cards PDF — separate bag, shared across series

---

## Known Limitations

- **Web Playback SDK 5-user limit**: Spotify development accounts are capped at 5 users. Fine for current use; production scale needs Spotify approval.
- **Mobile requires Spotify app**: REST API playback only — no in-browser audio on mobile.
- **No auth guards**: All routes are publicly accessible by URL. Fine for now.
- **Token expiry**: Handled via silent refresh using `refresh_token` (stored in `localStorage`). Falls back to login if refresh fails.

---

## Next Priorities

1. **Fun fact blurbs** — surface easter-egg facts in the UI. Candidate facts:
   - "When you press pause, you're actually playing John Cage's *4'33''* — a piece of music consisting entirely of silence."
   - "QR codes can store up to 3KB of data. ChimeLine uses about 40 bytes."
   - "The oldest song with a known composer is a Sumerian hymn from around 1400 BC."
   - "Vinyl records spin at 33⅓ RPM — a speed chosen in 1948 to fit a full symphony on one side."
   - "The first music video ever broadcast on MTV was 'Video Killed the Radio Star' by The Buggles, on August 1, 1981."
   - "A standard CD holds 74 minutes of audio — chosen specifically to fit Beethoven's 9th Symphony."
   - "Vangelis composed the *Chariots of Fire* soundtrack on a synthesizer — in 1981, that was controversial. The Academy gave him the Oscar for Best Original Score anyway."
   - "The *Chariots of Fire* title theme was composed overnight by Vangelis, reportedly in a single take."
   - "Vangelis's full name was Evangelos Odysseas Papathanassiou — 'Vangelis' is just easier to fit on a poster."
   - "The *Chariots of Fire* film is set during the 1924 Paris Olympics, but the iconic beach running scene was filmed in St Andrews, Scotland."
2. **Add to Home Screen prompt** — popup suggesting users install the PWA on compatible devices (iOS Safari, Android Chrome); use `beforeinstallprompt` on Android, show manual instructions on iOS

---

## Development

```bash
pnpm dev          # Dev server at https://localhost:5173 (HTTPS if .ssl/ certs exist)
pnpm build        # Production build → build/client/
pnpm preview      # Preview production build locally
```

**Environment** (`.env.local`):
```
VITE_SPOTIFY_CLIENT_ID=...
VITE_SPOTIFY_REDIRECT_URI=https://chimeline.prograd.no/callback
```

**Local HTTPS**: Place `cert.pem` and `key.pem` in `.ssl/` — needed for Spotify Web Playback SDK (requires HTTPS).

**Deploy**: push to `main` → GitHub Actions builds and deploys to `chimeline.prograd.no` automatically.

**Spotify redirect URIs** (register in Spotify dashboard):
- Local: `https://localhost:5173/callback`
- Production: `https://chimeline.prograd.no/callback`
