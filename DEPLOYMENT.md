# Deployment & Configuration

## Overview

The site is hosted on **Cloudflare Pages** at [rehydrate.space](https://rehydrate.space). Episode audio files are stored in **Cloudflare R2** and served via Cloudflare Pages Functions. The site HTML is built with [Eleventy](https://www.11ty.dev/).

## Architecture

```
GitHub repo (main branch)
    │
    ├── Push to main
    │       │
    │       ├── GitHub Actions ──► Syncs episode-media/*.mp3 ──► Cloudflare R2 (rehydratepodcast)
    │       │
    │       └── Cloudflare Pages (GitHub integration) ──► Builds Eleventy site ──► rehydrate.space
    │
    └── rehydrate.space
            │
            ├── /episodes/*.mp3  ──► Pages Function ──► R2 bucket (streamed with range support)
            └── Everything else  ──► Static HTML from Eleventy build
```

## Cloudflare Pages

**Project name:** `rehydratepodcast-github-io`

Cloudflare Pages is connected directly to the GitHub repo and auto-deploys on every push to `main`. It builds the Eleventy site and deploys the static output alongside the Pages Functions.

**Build settings (via `wrangler.toml`):**
- Output directory: `_site` (Eleventy default)
- R2 binding: `PODCAST_BUCKET` → `rehydratepodcast`

## Cloudflare R2

**Bucket name:** `rehydratepodcast`

Stores all episode mp3 files. Files are synced from `episode-media/` on every push to `main` via GitHub Actions using the AWS S3-compatible API.

The GitHub Actions workflow uses `--size-only` comparison and `--delete` to keep R2 in sync with the repo.

## Pages Functions

Located in `functions/`, these intercept requests to mp3 URLs and stream audio from R2.

| Function | Path | Purpose |
|---|---|---|
| `functions/episodes/[slug].js` | `/episodes/*.mp3` | Stream episode audio from R2 |
| `functions/episodes/pronunciations/[slug].js` | `/episodes/pronunciations/*.mp3` | Stream pronunciation audio from R2 |

Both functions support HTTP range requests so podcast players can seek without downloading the full file.

## Adding a New Episode

1. Process the episode image: place source image in `src-media/`, run `make images` to resize into `media/`
2. Place the mp3 in `episode-media/`
3. Create the episode template in `episodes/` (e.g. `episodes/s10e06-my-episode.njk`)
4. Add a summary file in `episodes/summaries/` if applicable
5. Commit and push to `main` — GitHub Actions syncs the mp3 to R2, Cloudflare Pages builds and deploys the site

## Local Development

### HTML/templates only

For working on episode pages, templates, and styles — Eleventy's built-in server is sufficient:

```bash
make serve
```

This builds to `rehydrate/` (not `_site`) and hot-reloads on changes. Audio will not work since the Pages Function and R2 are not running.

### Full stack (with audio)

To run with Pages Functions and R2 locally, use two terminals:

**Terminal 1** — Eleventy in watch mode:
```bash
npx @11ty/eleventy --config=eleventy-config.js --watch
```

**Terminal 2** — Wrangler serving the output:
```bash
# Local R2 simulation (audio will 404 unless you add files to the local store):
npx wrangler pages dev _site

# Or connect to the real R2 bucket:
npx wrangler pages dev _site --remote
```

Wrangler serves on port `8787` by default (configured in `wrangler.toml`).

## GitHub Actions

The workflow at `.github/workflows/publish.yml` runs on every push to `main` and only handles the R2 sync. The Cloudflare Pages build is triggered separately via GitHub integration — not by this workflow.

**Secrets required:**

| Secret | Description |
|---|---|
| `R2_BUCKET` | R2 bucket name |
| `R2_ACCOUNT_ID` | Cloudflare account ID (used in the endpoint URL) |
| `R2_ACCESS_KEY_ID` | R2 API token access key |
| `R2_SECRET_ACCESS_KEY` | R2 API token secret |
