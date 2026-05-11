# Modern SustainTrack Surface

## Why this path exists

- Selected legacy repo: `Hardik-S/SustainTrack`
- Selected on: `2026-05-11`
- Selection method: live `Get-Random` index over eligible Hardik-S repos older than six months (non-archived, non-fork, owned by `Hardik-S`)
- Objective: preserve existing app behavior while creating a cleaner, modernized version in `modern/` with stronger UX

## Old-to-new behavior map

### Preserved

- Carbon footprint calculator using form inputs for:
  - material mix
  - energy use
  - transport mode and distance
  - lifespan and recyclability
- Emission category outputs:
  - materials
  - manufacturing
  - distribution
  - use + end-of-life
- Dashboard-like persistence in browser storage and saved product list
- Recommendations displayed in four sustainability groups

### Modernized + extended

- Replaced legacy single-section flow with a modular surface:
  - dedicated calculator panel
  - result panel with direct actions
  - reduction planner with target slider
  - dashboard, charts, and quick KPI cards
- Added a reduction planner that turns a target percentage into actionable category suggestions
- Added save/search-oriented product card list and click-to-load behavior
- Added JSON and CSV export for saved records
- Added JSON/CSV import path to recover prior analytics
- Migrated storage compatibility:
  - reads legacy `sustainTrack_products`
  - writes modern `sustainTrack_modern_products_v2`
  - keeps old data readable and merged for continuity
- Improved accessibility and keyboard behavior:
  - clearer labels and sections
  - visible sections with semantic structure
  - larger click targets and readable contrast surface
- Added an Action Trail panel:
  - tracks calculation, save, import/export, filter, and reduction-target interactions
  - persists up to 40 action events in `localStorage` (`sustainTrack_action_trail_v1`)
  - added clear and copy controls for lightweight audit trails

## Rejected approaches

- Rewriting backend/storage layer: not needed because this legacy repo is a browser-only static surface.
- Replacing all charts with a framework: kept plain `Chart.js` to preserve behavior with minimal stack churn.

## Run / verify locally

- `node --check modern/app.js`
- `node --check modern/activity-log.js`
- Open `modern/index.html` via local static server and verify:
  - calculator creates a result
  - result card updates rating and score
  - reduction plan updates with slider changes
  - save and dashboard interaction works
  - JSON/CSV export buttons produce files

## Deployment notes

- This branch is ready for Vercel preview via static hosting if deployment is desired.
- `modern/` is a standalone surface and does not replace the root `index.html`.

## Next logical follow-up

1. Add deterministic local fixtures for quick smoke checks.
2. Add optional accessibility scan snapshot for mobile/tablet.
3. Add Vercel deploy and preview URL to automation state logs.
