# ChimeLine

A static web app for playing and scanning QR-encoded songs during a timeline-based card game.

## Overview

ChimeLine consists of two main features:

1. **QR Scanner** — Scan QR codes containing song metadata and play the track via a hidden Spotify player (play/pause button only visible).
2. **QR Generator** — Generate QR codes from Spotify tracks (single track search or bulk import from playlists) for card creation.

The app is fully static, hosted on GitHub Pages, and requires no backend.

## Features

- **Scanner**: Camera QR scanning → hidden Spotify playback
- **Generator (Single Track)**: Search Spotify or manual entry → generate QR code
- **Generator (Playlist)**: Import Spotify playlist → generate QR codes for all tracks
- **Spotify Integration**: PKCE OAuth for private playlist access; Web Playback SDK for preview/full track playback
- **Self-Contained QR**: Each QR encodes full JSON payload (title, artist, album, Spotify URI, release date, era)

## Tech Stack

- React + Vite + TypeScript
- Spotify Web API (PKCE auth)
- html5-qrcode (QR scanning)
- qrcode.react (QR generation)
- Spotify Web Playback SDK

## Project Structure

```
chimeline/
├── src/
│   ├── components/
│   │   ├── Scanner.tsx        # QR scanner + hidden player
│   │   └── Generator.tsx      # Single track & playlist import
│   ├── services/
│   │   ├── spotifyAuth.ts     # PKCE OAuth flow
│   │   ├── spotifySearch.ts   # Search API
│   │   ├── spotifyPlaylist.ts # Playlist fetching
│   │   ├── qrScanner.ts       # QR decoding
│   │   └── qrGenerator.ts     # QR encoding
│   ├── utils/
│   │   └── types.ts           # CardData, API types
│   ├── App.tsx                # Root component, tabs
│   ├── App.css
│   ├── main.tsx
│   └── index.css
├── public/
├── vite.config.ts
├── tsconfig.json
├── package.json
├── .env.example
└── README.md
```

## Getting Started

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production (GitHub Pages)
npm run build

# Preview production build locally
npm run preview
```

## Environment Variables

Create a `.env.local` file (copy from `.env.example`):

```
VITE_SPOTIFY_CLIENT_ID=your_spotify_app_client_id
VITE_SPOTIFY_REDIRECT_URI=http://localhost:5173/callback
VITE_GITHUB_PAGES_BASE_URL=https://yourusername.github.io/chimeline
```

See `.env.example` for more details.

## Card JSON Format

Each QR code encodes a `CardData` object:

```json
{
  "id": "track_001",
  "title": "Amazing Grace",
  "artist": "John Newton",
  "album": "Hymns",
  "spotifyUri": "spotify:track:3Z3NF3UUlS3Atoms2oakLm",
  "releaseDate": "1779-01-01",
  "era": "18th century"
}
```

## Deployment

1. Build: `npm run build`
2. Deploy `dist/` folder to GitHub Pages
3. Update `vite.config.ts` with your repository path
4. Ensure Spotify redirect URI matches your GitHub Pages URL

## Roadmap

- **Phase 1 (MVP)**: Single-track QR scanner + generator
- **Phase 2**: Playlist import
- **Phase 3**: PDF card generation for printing
- **Phase 4**: Card set management and sharing

## License

MIT
