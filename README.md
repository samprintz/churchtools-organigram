# ChurchTools Organigram

A self-hosted web application that fetches organizational structure data from ChurchTools and renders it as an interactive, printable organigram.

## Features

- Fetch organigram data from ChurchTools with one click
- Interactive HTML diagram with pan and zoom
- Person highlight: click any person to see all their roles across the diagram
- Download the diagram as a true vector SVG file (via dom-to-svg)
- Upload a previously saved `organigram.json`
- Configurable group types, status filters, and tags
- Light / dark / system theme
- Show or hide co-leaders and inactive groups

## Requirements

- Docker and Docker Compose
- A ChurchTools instance with API access
- Traefik + Authelia (or equivalent) for authentication

## Setup

### 1. Configure credentials

Copy `.env.example` to `.env` and fill in your ChurchTools credentials:

```dotenv
CT_BASEURL=https://your-instance.church.tools
CT_EMAIL=admin@example.com
CT_PASSWORD=secret
```

### 2. Create a data directory

The application stores `config.json` and `organigram.json` in a `data/` directory that must be mounted as a Docker volume. Create it on the host:

```bash
mkdir -p data
```

### 3. Run with Docker Compose

```bash
docker compose up -d
```

The application listens on port 3000. Route it through Traefik + Authelia for authentication.

## Development

```bash
npm install
npm run dev       # starts Vite dev server + Hono server concurrently
npm test          # run unit tests
npm run typecheck # TypeScript check (no emit)
npm run build     # compile server + bundle client
```

## Configuration

All settings are stored in `data/config.json` and can be edited via the web UI:

- **Fetch Settings** (toolbar button): root group ID, group types, status filters, include/exclude tags
- **Display Settings** (toolbar button): show/hide co-leaders, show/hide inactive groups, theme, per-type colors

Credentials (`CT_BASEURL`, `CT_EMAIL`, `CT_PASSWORD`) are read from `.env` at fetch time and never stored in `config.json`.
