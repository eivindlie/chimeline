# ChimeLine

A static React + TypeScript web app for playing songs via QR codes during a timeline-based card game.

## Overview

ChimeLine has two modes:

1. **Scanner** — Scan QR codes to play songs silently via hidden Spotify player
2. **Generator** — Create QR codes from single Spotify tracks or import playlists

Each QR code embeds full JSON (no backend needed), making the app fully static and self-contained. Perfect for on-device play during timeline card games.

## Setup

### Prerequisites

- Node.js v16+
- Spotify Developer account (get [Client ID here](https://developer.spotify.com/dashboard))
- GitHub account (for GitHub Pages hosting, optional)

### Installation

```bash
npm install
```

### Environment Setup

Create a `.env.local` file (copy from `.env.example`):

```bash
cp .env.example .env.local
```

Then update with your Spotify credentials:

```
VITE_SPOTIFY_CLIENT_ID=your_client_id_here
VITE_SPOTIFY_REDIRECT_URI=http://localhost:5173/chimeline/callback
```

### Development

Start the dev server:

```bash
npm run dev
```

The app will be available at `http://localhost:5173/chimeline/`.

## Building for Production

Create an optimized build:

```bash
npm run build
```

Output goes to `dist/`. This is a fully static SPA (no server runtime needed).

## Deployment to GitHub Pages

1. Update your Spotify app settings:
   - Redirect URI: `https://yourusername.github.io/chimeline/callback`

2. Build and deploy:

   ```bash
   npm run build
   ```

3. Push `dist/` to GitHub Pages (via `gh-pages` package or manual upload).

## Later: Custom Domain Setup

When moving to `chimeline.prograd.no`:
- Update `vite.config.ts`: `base: "/"` (remove `/chimeline/` prefix)
- Update `.env.local`: `VITE_SPOTIFY_REDIRECT_URI=https://chimeline.prograd.no/callback`

## Tech Stack

- **React Router** (Framework Mode, SPA)
- **TypeScript**
- **Vite** (build tool)
- **TailwindCSS** (styling)
- **Spotify Web API** (PKCE OAuth, track search, playlist fetch)
- **html5-qrcode** (QR scanning)
- **qrcode.react** (QR generation)

## Architecture

```
app/
├── root.tsx              # Root layout + auth state
├── routes/
│   ├── scanner.tsx       # QR scanner page
│   ├── generator.tsx     # QR generator page
│   └── callback.tsx      # Spotify OAuth callback
└── lib/
    ├── types.ts          # Type definitions
    ├── constants.ts      # API endpoints, QR settings
    ├── spotifyAuth.ts    # PKCE OAuth flow
    ├── spotifySearch.ts  # Track search
    ├── spotifyPlaylist.ts# Playlist import
    ├── qrScanner.ts      # QR decoding
    └── qrGenerator.ts    # QR encoding
```

## Key Features

- ✅ **No backend** — All state client-side (sessionStorage)
- ✅ **Static hosting** — Works on GitHub Pages
- ✅ **PKCE OAuth** — Spotify login without server
- ✅ **Full TypeScript** — Type-safe throughout
- ✅ **Responsive design** — Mobile-first UI
- ✅ **Self-contained QR codes** — JSON embedded, no URL shortener

---

See [CLAUDE.md](CLAUDE.md) for full implementation plan and architecture details.
