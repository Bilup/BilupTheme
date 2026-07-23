# BilupTheme


A theme marketplace for Bilup mods — browse, share, and download custom themes for **Bilup** and more. This is a Node.js port of the original OSL/Go-based backend.

## Features

- **Browse & Search** — Discover themes by name, color, or platform
- **Upload & Share** — Upload JSON theme files; supports batch upload with auto-detection
- **Cross-Platform Export** — Convert themes between Bilup, MistWarp, and NitroBolt formats
- **Rate & Review** — Like/dislike themes and track popularity
- **User Profiles** — Sign in with **Rotur** OAuth; manage your themes and likes
- **Self-Hosted Fonts** — Poppins fonts bundled locally (no external CDN dependency)
- **Static Build** — Generate fully static HTML for deployment to GitHub Pages or any static host

## Quick Start

```bash
npm install
npm start
```

Open [http://localhost:5609](http://localhost:5609)

## Scripts

| Command | Description |
|---------|-------------|
| `npm start` | Start the dev server (port 5609) |
| `npm run dev` | Same as `npm start` |
| `npm run build` | Generate static pages into `build-pages/` |
| `npm run fetch-fonts` | Re-download Poppins fonts from Google Fonts |

## Build

Generate a fully static version of the site:

```bash
npm run build
```

Output goes to `build-pages/`. All asset paths are relative, so the output works on any static host (GitHub Pages, Vercel, Netlify, etc.) without configuration.