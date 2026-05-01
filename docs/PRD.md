# Product Requirements Document: ChurchTools Organigram

**Version:** 2.0
**Date:** 2026-04-25
**Status:** Draft

---

## 1. Executive Summary

ChurchTools Organigram is a self-hosted web application that fetches organizational structure data from the ChurchTools church management API and renders it as an interactive, printable organigram. Church administrators can see at a glance which groups exist, how they are nested, and who leads each group — all in a clean, dense diagram that can be downloaded as an SVG.

The application replaces a legacy CLI proof-of-concept (GraphML export for yEd) with a modern full-stack TypeScript web app. Data fetching is configuration-driven: administrators define which group types, status IDs, and tags are relevant, then trigger a fetch. The resulting `organigram.json` is persisted and displayed immediately. The diagram is interactive — panning, zooming, and person-based highlighting are all supported in the browser.

**MVP goal:** A single Docker container that any Authelia-authenticated church employee can open in a browser to view, refresh, and download their church's organigram, with no additional authentication or infrastructure beyond Traefik + Authelia.

---

## 2. Mission

**Mission statement:** Make a church's organizational structure instantly visible and shareable, with zero friction for end users and minimal setup for administrators.

### Core Principles

1. **Simplicity over configurability** — one config file, one data file, one container. No databases, no user accounts, no queues.
2. **Data fidelity** — all fetched nodes (including level 5+) are persisted in `organigram.json`; truncation is a display concern only.
3. **Display/fetch separation** — what data is fetched and how it is displayed are independently configurable; changing display settings never triggers a re-fetch.
4. **Compact, dense diagrams** — the SVG layout prioritizes information density over visual whitespace; the goal is a diagram that fits on one printed page.
5. **No app-level auth** — security is delegated entirely to Traefik + Authelia; the app trusts all incoming requests.

---

## 3. Target Users

### Primary Persona: Church Administrator / Office Staff

- Manages group structure in ChurchTools
- Needs a quick visual reference for "who leads what"
- Comfortable with basic web apps; not a developer
- May want to share the organigram as a file (SVG) with leadership

### Secondary Persona: Church Leadership

- Reads the organigram but does not configure or fetch
- May want to highlight a specific person across all their roles
- Expects the diagram to load quickly and be readable on screen

### Technical Persona: System Administrator

- Sets up the Docker container and Authelia integration
- Provides `.env` credentials
- May need to edit `config.json` directly or via the web UI
- Comfortable with Docker Compose and basic infrastructure

---

## 4. MVP Scope

### Core Functionality

- ✅ Fetch organigram data from ChurchTools API (triggered manually)
- ✅ Persist fetched data as `organigram.json`
- ✅ Render organigram as interactive HTML diagram
- ✅ Pan and zoom the SVG diagram
- ✅ Download diagram as SVG file
- ✅ Upload an existing `organigram.json` file
- ✅ Display fetch/filter settings in a modal dialog
- ✅ Display rendering/display settings in a side drawer
- ✅ Light / dark / system theme
- ✅ Person click-to-highlight across all nodes
- ✅ Show/hide co-leaders (display toggle, does not affect stored data)
- ✅ Show/hide inactive groups (display toggle)
- ✅ Overwrite confirmation when re-fetching existing data

### Technical

- ✅ TypeScript throughout (server + client + shared types)
- ✅ Hono backend serving both API and static client build
- ✅ Vue 3 + Vuetify 3 frontend
- ✅ Zod schema validation on all API boundaries
- ✅ Unit tests for fetcher transform logic and tree builder
- ✅ Single `config.json` for all settings
- ✅ `data/` directory mounted as Docker volume

### Integration

- ✅ ChurchTools REST API (groups, persons, members, hierarchies)
- ✅ Credentials via `.env` (CT_BASEURL, CT_EMAIL, CT_PASSWORD)
- ❌ OAuth / ChurchTools SSO
- ❌ Webhooks or scheduled auto-fetch
- ❌ Multiple ChurchTools instances

### Deployment

- ✅ Single Docker container (multi-stage build)
- ✅ Docker Compose setup
- ✅ Traefik + Authelia compatible (no app-level auth)
- ❌ Kubernetes / Helm chart
- ❌ Multi-user permissions or roles within the app

---

## 5. User Stories

**US-1: View the current organigram**
As a church staff member, I want to open the web app and immediately see the current organigram, so that I can quickly understand the group structure without opening ChurchTools.
> *Example: The app loads and shows the last fetched diagram with group names, leaders, and color-coded group types.*

**US-2: Refresh from ChurchTools**
As an administrator, I want to trigger a fresh fetch from ChurchTools with one click, so that the diagram reflects the latest group and membership data.
> *Example: I click "Fetch from ChurchTools" in the toolbar. If a diagram already exists I confirm the overwrite. The new diagram is displayed within seconds.*

**US-3: Find where a person leads**
As a church leader, I want to click on a person's name in the diagram and see all nodes where they appear highlighted, so that I can quickly understand someone's full involvement across all groups.
> *Example: I click "Anna Müller" in one node; all other nodes where she appears as leader or co-leader get a colored accent border. I press ESC to clear.*

**US-4: Download the diagram**
As an administrator, I want to download the organigram as an SVG file, so that I can share it with leadership via email or include it in a presentation.
> *Example: I click "Download SVG" in the toolbar. A file named `organigram.svg` is saved to my downloads folder.*

**US-5: Configure which groups to include**
As an administrator, I want to configure the root group ID, relevant group types, and status filters in the app, so that I don't have to edit config files manually.
> *Example: I open the "Fetch Settings" dialog, change the root group ID from 11 to 15, add a new group type with leader role IDs, and click "Save and Fetch".*

**US-6: Adjust display settings**
As a user, I want to toggle co-leaders on/off and switch between light and dark mode, so that I can customize the view for my current context (e.g. projecting in a meeting vs. reading on my phone).
> *Example: I open the settings drawer and toggle "Show Co-Leaders" off — co-leader badges disappear from all nodes immediately, without re-fetching.*

**US-7: Upload a saved organigram**
As an administrator, I want to upload a previously downloaded `organigram.json`, so that I can restore a known-good state or share data between environments.
> *Example: I click "Upload JSON" and select a file. The diagram is immediately displayed and saved as the active organigram.*

**US-8 (technical): Validate configuration at API boundary**
As a developer, I want all config and organigram data to be validated against a Zod schema before being written to disk, so that malformed data never corrupts the persisted state.
> *Example: A PUT /api/config request with an invalid color string returns HTTP 400 with a Zod validation error message.*

---

## 6. Core Architecture & Patterns

### Architecture

Single-process Node.js server (Hono) serving:
- REST API at `/api/*`
- Static Vite-built Vue 3 client at `/`

No database — all state in two JSON files on disk (`data/config.json`, `data/organigram.json`) mounted via Docker volume.

### Directory Structure

```
src/
  shared/
    types.ts          # TypeScript interfaces (OrgChartFile, AppConfig, etc.)
    schemas.ts        # Zod validation schemas
  server/
    index.ts          # Hono app entry point
    routes/
      fetch.ts        # POST /api/fetch
      organigram.ts   # GET/POST /api/organigram, GET /api/organigram/download
      config.ts       # GET/PUT /api/config
    services/
      churchtools.ts        # ChurchTools API client + transform
      churchtools.test.ts   # Unit tests for transform logic
      config.ts             # File I/O for config.json and organigram.json
  client/
    main.ts
    App.vue
    components/
      Toolbar.vue
      OrgChart.vue            # HTML renderer with dom-to-svg export
      ConfigEditor.vue        # Display settings drawer
      FetchConfigDialog.vue   # Fetch/filter settings modal
      ConfirmDialog.vue
    composables/
      useOrganigram.ts
      useConfig.ts
    lib/
      orgChartLayout.ts       # Pure tree builder (testable, no DOM)
      orgChartLayout.test.ts  # Unit tests for layout math
    plugins/
      vuetify.ts
data/
  config.json         # Runtime config (volume-mounted)
  organigram.json     # Persisted organigram (volume-mounted)
```

### Key Design Patterns

- **Shared types:** `src/shared/types.ts` is imported by both server and client. Zod schemas in `src/shared/schemas.ts` are the single source of truth for validation.
- **Display/fetch separation:** `showCoLeaders` and `showInactiveGroups` are display-only toggles stored in config. The fetcher always stores full data (all co-leaders, all inactive groups). The renderer filters at render time.
- **Pure tree builder:** `orgChartLayout.ts` builds an `OrgTree` data structure (`buildOrgTree`) with no DOM or Vue dependencies, enabling unit testing with Vitest. The HTML renderer handles all visual layout via CSS flex.
- **Config panel duality:** Both the settings drawer (ConfigEditor) and the fetch dialog (FetchConfigDialog) hold a full deep copy of `AppConfig` as local state. Each renders only its relevant subset of fields. Saving emits the full config, so no fields are ever silently dropped.

---

## 7. Features

### 7.1 Data Fetcher

**Purpose:** Fetch organizational data from ChurchTools and transform it into `OrgChartFile`.

**ChurchTools API calls (parallel after login):**
- `GET /api/groups` — paginated, all pages fetched
- `GET /api/persons` — paginated (limit 500), all pages fetched
- `GET /api/groups/members` — single call (not paginated)
- `GET /api/groups/hierarchies` — single call (not paginated)

**Filtering logic (in order):**
1. Root group (by `rootGroupId`) — always included
2. Groups with an `excludeTag` — excluded regardless of type
3. If `relevantGroupStatusIds` is non-empty — exclude groups whose status is not in the list
4. Groups whose `groupTypeId` is in `config.groupTypes` — included
5. Groups with an `includeTag` — included regardless of type
6. All others — excluded

**Inactive marking:** A node gets `inactive: true` if its `groupStatusId` is in `inactiveGroupStatusIds` (array).

**Parent assignment:** For each included non-root group, walk up the ChurchTools hierarchy to find the nearest included ancestor. Groups with no path to the root are logged and skipped (orphaned).

**Co-leaders:** Always stored in `organigram.json`, regardless of `showCoLeaders` config.

### 7.2 HTML Renderer with SVG Export

**Layout (top-anchored, compact columns):**

```
         [Root]
    ┌──────────────────┐
  [L2-A]            [L2-B]
  [L3-A1]           [L3-B1]
  [L3-A2]           [L3-B2]
    • L4-A2a  [Leader] [Co-leader]
    • L4-A2b  [Leader]
    • L4-A2c +2  [Leader]   ← +N = hidden level-5 children count
```

- **Level 1** (root): centered horizontally at the top via `display: flex; justify-content: center`
- **Level 2**: one card per column, spread horizontally below root via `display: flex; gap: 16px`
- **Level 3**: stacked vertically below their level-2 column via `flex-direction: column; gap: 6px`
- **Level 4**: inline items inside level-3 box — colored dot + label box + optional `+N` + person pills, all via `display: flex; flex-wrap: wrap`
- **Level 5+**: not rendered; level-4 items with children show `+N` (count of hidden children)

**Node rendering (HTML+CSS, all colors as inline styles):**
- `<div>` for card with border, border-radius, background
- Colored header `<div>` with group-type background color
- Per person: styled `<div>` pill with cursor pointer — leaders and co-leaders styled differently
- L4 items: `<span>` dot + label box + person pills flowing inline

**Inactive nodes:** When `showInactiveGroups` is true, inactive nodes render with gray header color and 50% opacity. When false, excluded entirely by `buildOrgTree`.

**Pan/zoom:** `@panzoom/panzoom` applied to the chart HTML `<div>`. Initial pan position corrected for panzoom's 50%/50% CSS transform-origin (`startX = targetX − chartW/2·(1−s)`).

**SVG export:** `elementToSVG(chartEl)` from `dom-to-svg` (true vector SVG — `<rect>`, `<text>`, `<path>`) → `inlineResources(svgDoc)` (inlines fonts) → Blob → download. Export renders in neutral state (no highlight, no panzoom transform) at full 1:1 diagram scale.

**Font:** Roboto loaded via `@fontsource/roboto` (self-hosted, no Google Fonts CDN dependency). All `font-family` declarations fall back to `Arial, sans-serif`.

### 7.3 Person Highlight

- Click a person badge → compute the set of all node IDs where that person appears in `leaders` or (if `showCoLeaders` is on) `coLeaders`
- Highlighted nodes get a distinct accent stroke (no dimming of others)
- Clear: click same person again, click a different person (switches highlight), press ESC, or click the floating "Clear highlight" button
- State: a single `highlightedPersonId: ref<number | null>` in the OrgChart component

### 7.4 Config: Fetch/Filter Dialog

Modal dialog (`v-dialog`) opened from a toolbar button.

**Fields:**
- Root Group ID (number input)
- Group Types: add/remove/edit — each type has: ID, name, color, leader role IDs (chips), co-leader role IDs (chips)
- Relevant Group Status IDs (chip array)
- Inactive Group Status IDs (chip array, replaces old singular field)
- Include Tags / Exclude Tags (chip arrays)

**Actions:** Cancel | Save | Save and Fetch

### 7.5 Config: Display Settings Drawer

Side drawer (`v-navigation-drawer`) opened from a toolbar icon.

**Fields:**
- Show Co-Leaders (toggle)
- Show Inactive Groups (toggle)
- Theme: System / Light / Dark (select)
- Per group type (name + color editor, one row per configured type)

**Actions:** Save (closes drawer on success)

---

## 8. Technology Stack

### Backend

| Technology | Version | Purpose |
|---|---|---|
| Node.js | 20+ | Runtime |
| TypeScript | 5.4+ | Language |
| Hono | 4.6 | HTTP server + routing |
| @hono/node-server | 1.12 | Node.js adapter for Hono |
| Zod | 3.23 | Schema validation |
| dotenv | latest | `.env` loading |
| tsx | latest | Dev-mode TS execution |

### Frontend

| Technology | Version | Purpose |
|---|---|---|
| Vue 3 | 3.4+ | UI framework |
| Vuetify | 3.6+ | Component library + theming |
| @mdi/font | latest | Material Design icons |
| @panzoom/panzoom | 4.x | HTML diagram pan/zoom |
| dom-to-svg | 0.12+ | True vector SVG export from HTML |
| @fontsource/roboto | 5.x | Self-hosted Roboto font |
| Vite | 5.3+ | Build tool + dev server |

### Testing

| Technology | Purpose |
|---|---|
| Vitest | Unit test runner |

### Deployment

| Technology | Purpose |
|---|---|
| Docker | Container runtime |
| Docker Compose | Local/production orchestration |
| Traefik | Reverse proxy (external) |
| Authelia | Authentication (external) |

---

## 9. Security & Configuration

### Authentication

- **In scope:** Traefik + Authelia handle all authentication. The app trusts all requests that reach it.
- **Out of scope:** App-level login, session management, per-user permissions, CSRF protection.

### Credentials (`.env`)

```dotenv
CT_BASEURL=https://example.church.tools
CT_EMAIL=admin@example.com
CT_PASSWORD=secret
```

These are read at fetch time from `process.env`. Never stored in `config.json` or exposed via any API endpoint.

### Configuration (`data/config.json`)

```json
{
  "rootGroupId": 11,
  "groupTypes": [
    {
      "id": 1,
      "name": "Kleingruppe",
      "color": "#f5c211",
      "leaderRoleIds": [9],
      "coLeaderRoleIds": [10]
    }
  ],
  "showCoLeaders": true,
  "showInactiveGroups": true,
  "includeTags": [],
  "excludeTags": [],
  "relevantGroupStatusIds": [],
  "inactiveGroupStatusIds": [4],
  "theme": "system"
}
```

All config writes are validated via Zod before being written to disk.

### Data Security

- `organigram.json` contains person names (first + last). The file is only accessible to users authenticated through Authelia.
- No personal data is stored beyond what is already visible in ChurchTools.
- No logging of person names or credentials in application logs.

---

## 10. API Specification

### Base URL
All routes prefixed with `/api`.

---

### `POST /api/fetch`
Fetch organigram data from ChurchTools using the current saved config.

**Request:** No body.

**Response 200:**
```json
{
  "data": {
    "schemaVersion": "1",
    "generatedAt": "2026-04-25T10:00:00.000Z",
    "nodes": [ ... ]
  }
}
```

**Response 401:** ChurchTools login failed
**Response 502:** ChurchTools API error

---

### `GET /api/organigram`
Load the saved organigram.

**Response 200:** `OrgChartFile` JSON
**Response 404:** No organigram saved yet

---

### `POST /api/organigram`
Save an organigram (validated against Zod schema).

**Request body:** `OrgChartFile` JSON
**Response 200:** `{ "ok": true }`
**Response 400:** Validation error

---

### `GET /api/organigram/download`
Download `organigram.json` as a file attachment.

**Response 200:** `Content-Disposition: attachment; filename="organigram.json"`

---

### `GET /api/config`
Load the saved configuration.

**Response 200:** `AppConfig` JSON
**Response 200 (fallback):** Default config if no file exists

---

### `PUT /api/config`
Save configuration (validated against Zod schema).

**Request body:** `AppConfig` JSON
**Response 200:** Saved `AppConfig`
**Response 400:** Validation error

---

## 11. Success Criteria

### MVP Success Definition

The MVP is successful when a church administrator can:
1. Deploy the Docker container with a `.env` file
2. Open the web app, trigger a fetch, and see their organigram rendered correctly
3. Download the organigram as an SVG suitable for sharing
4. Adjust display settings without re-fetching

### Functional Requirements

- ✅ Fetch from ChurchTools completes without error for a real instance
- ✅ All configured group types appear in the diagram with correct colors
- ✅ Leaders and co-leaders appear on their respective group nodes
- ✅ Inactive groups display with gray styling when `showInactiveGroups: true`
- ✅ Inactive groups are hidden when `showInactiveGroups: false`
- ✅ Co-leader badges appear/disappear instantly when toggling `showCoLeaders`
- ✅ Person highlight correctly identifies all nodes across the full diagram
- ✅ Pan and zoom work smoothly on desktop
- ✅ SVG download produces a readable, standalone file
- ✅ Config changes persist across page reloads
- ✅ All API endpoints return Zod validation errors for malformed input
- ✅ All server-side tests pass (`npm test`)
- ✅ TypeScript build succeeds with no errors (`npm run typecheck`)

### Quality Indicators

- Tree builder unit tests cover all level assignments, hidden-children handling, and inactive-node filtering
- No use of `d3-org-chart` or other charting libraries for layout
- `organigram.json` stores all nodes including level 5+ (display truncation only)
- `showCoLeaders` does not affect what is stored in `organigram.json`

---

## 12. Implementation Phases

### Phase A — Foundation (Repo Cleanup + Data Model)

**Goal:** Clean slate with correct shared types. Everything downstream depends on this.

**Deliverables:**
- ✅ Delete `app/` directory entirely
- ✅ Remove `run.sh`, `run.cmd`
- ✅ Rewrite `README.md` for web app
- ✅ Update `Dockerfile` (remove brittle `COPY data/config.json`)
- ✅ `types.ts`: remove `source`, rename to `inactiveGroupStatusIds: number[]`, add `showInactiveGroups: boolean`
- ✅ `schemas.ts`: mirror all type changes in Zod

**Validation:** `npm run typecheck` surfaces all downstream type errors as a checklist.

---

### Phase B — Server (Fetcher + Tests)

**Goal:** Server correctly stores all co-leaders and handles plural inactive status IDs.

**Deliverables:**
- ✅ `churchtools.ts`: remove `showCoLeaders` guard at transform time
- ✅ `churchtools.ts`: `inactiveGroupStatusIds` array membership check
- ✅ `churchtools.ts`: remove `source` field from output
- ✅ `config.ts`: update `DEFAULT_CONFIG`
- ✅ `churchtools.test.ts`: adapt all affected tests, add new cases

**Validation:** `npm test` — all tests pass.

---

### Phase C — Custom SVG Renderer (Largest Change)

**Goal:** Replace d3-org-chart with a custom, testable SVG layout and renderer.

**Deliverables:**
- ✅ `src/client/lib/orgChartLayout.ts` — pure layout algorithm
- ✅ `src/client/lib/orgChartLayout.test.ts` — layout unit tests
- ✅ `src/client/components/OrgChart.vue` — complete rewrite:
  - Pure SVG rendering (no `<foreignObject>`)
  - `@panzoom/panzoom` for pan/zoom
  - Person highlight with floating clear button + ESC key
  - `showInactiveGroups` filtering
  - `exportSvg` via XMLSerializer
- ✅ `package.json`: remove `d3-org-chart`, add `@panzoom/panzoom`

**Validation:** `npm test` passes for layout tests. Visual verification in `npm run dev`.

---

### Phase D — Config UI Split + Wiring

**Goal:** Two separate config panels; full app wired together.

**Deliverables:**
- ✅ `ConfigEditor.vue`: stripped to display settings only (showCoLeaders, showInactiveGroups, theme, per-type name+color)
- ✅ `FetchConfigDialog.vue`: new modal with all fetch/filter fields, Save and Save-and-Fetch actions
- ✅ `Toolbar.vue`: add "open fetch config" button
- ✅ `App.vue`: wire FetchConfigDialog, pass `showInactiveGroups` to OrgChart, add `onSaveFetchConfig` and `onSaveAndFetch` handlers

**Validation:** Full end-to-end flow in `npm run dev`. `npm run build` succeeds.

---

### Phase E — HTML Rendering + dom-to-svg Export

**Goal:** Replace custom SVG renderer with HTML+CSS rendering for natural flow layout (especially L4 pill wrapping). Keep true vector SVG export via dom-to-svg.

**Deliverables:**
- ✅ `npm install dom-to-svg @fontsource/roboto`
- ✅ `src/client/main.ts`: add `@fontsource/roboto/400.css` and `@fontsource/roboto/500.css` imports
- ✅ `src/client/lib/orgChartLayout.ts`: replace geometry layout engine with lean tree builder (`buildOrgTree`)
- ✅ `src/client/lib/orgChartLayout.test.ts`: rewrite tests for `buildOrgTree`
- ✅ `src/client/components/OrgChart.vue`: full rewrite — HTML flex layout, inline `:style` bindings for all colors, panzoom on HTML div with corrected 50%/50% origin math, dom-to-svg export

**Key technical decisions:**
- All colors applied as inline styles (not CSS variables) to work around dom-to-svg bug #201
- L4 pill wrapping delegated to CSS `flex-wrap` — no manual char-count estimation needed
- Export: clear highlight → remove transform → `elementToSVG` → restore → `inlineResources` → download

**Validation:** `npm test` — 46 tests pass. `npm run typecheck` — clean.

---

## 13. Future Considerations

- **Scheduled auto-fetch:** Cron-triggered fetch at a configurable interval, so the diagram is always current without manual action.
- **Multiple profiles:** Support multiple named filter configurations (e.g. one for small groups, one for service teams), switchable in the UI.
- **Deep-link to highlighted person:** URL hash encodes the highlighted person ID, enabling shareable links.
- **Zoom-to-fit button:** One-click to reset pan/zoom to fit the full diagram in the viewport.
- **Search/filter by group name:** A search bar that highlights or filters nodes by name, useful for large diagrams.
- **Export as PDF:** Print-optimized layout with the organigram scaled to fit A4/Letter.
- **ChurchTools OAuth:** Replace credential-based login with OAuth so individual user permissions from ChurchTools are respected.
- **Responsive mobile layout:** Touch-friendly pan/zoom and collapsible columns for phone-sized viewports.
- **Diff view:** Highlight what changed since the last fetch (new groups, removed groups, leadership changes).

---

## 14. Risks & Mitigations

**R1: ChurchTools API pagination changes**
*Risk:* ChurchTools silently changes pagination behavior, causing incomplete data fetches.
*Mitigation:* The `shouldContinuePaging` function is unit-tested against pagination metadata. Add a warning log when the fetched count differs from the expected total.

**R2: SVG export fidelity**
*Risk:* The exported SVG renders differently when opened in tools like Inkscape or browsers due to missing font references or unsupported CSS in dom-to-svg output.
*Mitigation:* Use `inlineResources()` to embed Roboto font data directly into the SVG. All colors are applied as inline styles (not CSS variables) to avoid dom-to-svg bug #201. Export uses neutral state (no highlight, no transform) for consistent output. Test export in Chrome, Firefox, and Inkscape before release.

**R3: Large diagrams (100+ nodes) performance**
*Risk:* A church with many groups produces a diagram that is slow to lay out and render in the browser.
*Mitigation:* The layout algorithm is O(n) and runs outside the render cycle. SVG rendering via pure elements (no virtual DOM diffing per node) is fast. Profile at 200 nodes before shipping.

**R4: Config/data file corruption**
*Risk:* An interrupted write to `config.json` or `organigram.json` corrupts the file, breaking the app on next load.
*Mitigation:* Write to a `.tmp` file first, then atomically rename. Wrap all file reads in try/catch and fall back to defaults (already done for config).

**R5: `data/` volume not mounted in production**
*Risk:* Administrator runs the container without mounting the `data/` volume; config and organigram data are lost on container restart.
*Mitigation:* Document the volume mount prominently in the README. Consider writing a startup warning to the console if `data/` appears to be inside the container filesystem rather than a mount.

---

## 15. Appendix

### Related Documents
- Conversation design session (this document was derived from): `2026-04-25` design Q&A

### Key Dependencies

| Package | Purpose | Link |
|---|---|---|
| `hono` | Backend HTTP framework | https://hono.dev |
| `@hono/node-server` | Node.js adapter | https://hono.dev |
| `zod` | Schema validation | https://zod.dev |
| `vue` | Frontend framework | https://vuejs.org |
| `vuetify` | UI component library | https://vuetifyjs.com |
| `@panzoom/panzoom` | HTML diagram pan/zoom | https://github.com/timmywil/panzoom |
| `dom-to-svg` | True vector SVG export from HTML | https://github.com/nicolo-ribaudo/dom-to-svg |
| `@fontsource/roboto` | Self-hosted Roboto font | https://fontsource.org/fonts/roboto |
| `vite` | Build tool | https://vitejs.dev |
| `vitest` | Test runner | https://vitest.dev |

### `OrgChartFile` Schema (v1)

```typescript
interface OrgChartFile {
  schemaVersion: '1';
  generatedAt: string;       // ISO-8601
  nodes: OrgNode[];
}

interface OrgNode {
  id: string;                // "group-{churchtools_id}"
  parentId: string | null;   // null = root
  name: string;
  groupTypeId: number;
  inactive?: boolean;
  leaders: Person[];
  coLeaders: Person[];
}

interface Person {
  id: number;
  firstName: string;
  lastName: string;
}
```

### `AppConfig` Schema

```typescript
interface AppConfig {
  rootGroupId: number;
  groupTypes: GroupTypeConfig[];
  showCoLeaders: boolean;
  showInactiveGroups: boolean;
  includeTags: string[];
  excludeTags: string[];
  relevantGroupStatusIds: number[];
  inactiveGroupStatusIds: number[];
  theme: 'light' | 'dark' | 'system';
}

interface GroupTypeConfig {
  id: number;
  name: string;
  color: string;             // hex, e.g. "#f5c211"
  leaderRoleIds: number[];
  coLeaderRoleIds: number[];
}
```

### Repository Structure (post-cleanup)

```
churchtools-organigram/
├── src/                    # Application source
├── data/                   # Runtime data (volume-mounted in Docker)
├── dist/                   # Build output (gitignored)
├── .env.example            # Credential template
├── Dockerfile
├── docker-compose.yml
├── package.json
├── tsconfig.json
├── tsconfig.server.json
├── vite.config.ts
└── vitest.config.ts
```
