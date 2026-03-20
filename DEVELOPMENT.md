# ChimeLine Development Guide

## Quick Start

```bash
# Install dependencies
pnpm install

# Generate SSL certificate for local HTTPS (one-time)
pnpm setup:https

# Start dev server
npm run dev

# Visit: https://localhost:5174
```

## Why HTTPS?

The Spotify Web Playback SDK requires HTTPS to work due to browser security policies. A self-signed certificate is used locally for development.

Local certificates are stored in `.ssl/` folder (git-ignored) and are valid for 365 days.

## Accepting the Self-Signed Certificate

When you visit `https://localhost:5174`, your browser will show a warning about an untrusted certificate. This is normal.

**Chrome/Edge:**
1. Click "Advanced"
2. Click "Proceed to localhost (unsafe)"

**Safari:**
1. Click "Show Details"
2. Click "visit this website"

**Firefox:**
1. Click "Advanced..."
2. Click "Accept the Risk and Continue"

The certificate is valid for 365 days. If it expires, run `pnpm setup:https` again.

## Spotify OAuth Setup

To test the full app, you'll need Spotify API credentials:

1. Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Create an app
3. Add Redirect URI: `https://localhost:5174/callback`
4. Copy your **Client ID**
5. Create `.env.local` file:
   ```
   VITE_SPOTIFY_CLIENT_ID=YOUR_CLIENT_ID_HERE
   ```

## Available Scripts

- `npm run dev` — Start dev server with HTTPS
- `npm run build` — Build for production
- `npm run preview` — Preview production build locally
- `npm run typecheck` — Check TypeScript types
- `pnpm setup:https` — Generate/regenerate SSL certificate

## Troubleshooting

**"Failed to generate certificate"**
- Make sure OpenSSL is installed: `brew install openssl`

**"CORS error with Spotify SDK"**
- Ensure you're on HTTPS (not HTTP)
- Check your `.env.local` has the correct Client ID

**"postMessage target origin mismatch"**
- This error means the SDK is loading from HTTPS but your dev server is HTTP
- If the dev server is running on HTTP, you need HTTPS for the SDK to work
- Run `pnpm setup:https` and restart

## Project Structure

- `app/routes/` — Route components (file-based routing)
- `app/lib/` — Shared utilities (auth, API, QR code)
- `public/` — Static files (GitHub Pages 404.html)
- `vite.config.ts` — Vite configuration (HTTPS setup here)

## Spotify API Scopes

The app requests these scopes:
- `streaming` — Required for Web Playback SDK
- `user-read-email` — User identification
- `user-read-private` — User profile access
