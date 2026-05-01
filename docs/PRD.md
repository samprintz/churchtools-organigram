# Product Requirements Document: ChurchTools Organigram Generator

## 1. Executive Summary

ChurchTools Organigram Generator is a self-hosted web application that fetches organisational data from a ChurchTools instance, transforms it into a clean, interactive organigram, and allows users to export it as a compact PDF. The application targets church administrators and team leaders who need a visual, up-to-date overview of their ministry structure without manual diagram maintenance.

The system is split into three independently testable modules: a ChurchTools data fetcher (transforms raw API data into a portable JSON file), a web renderer (displays the organigram interactively), and a PDF generator (produces a clean A4 export). These modules communicate through a shared, versioned data format, allowing any module to be replaced or tested in isolation.

**MVP Goal:** Deliver a working, Dockerised web application that fetches group and leader data from ChurchTools, renders an interactive organigram in the browser, and exports a compact A4 PDF — all driven by a `config.json` that is editable from within the UI.

---

## 2. Mission

**Mission Statement:** Provide church teams with an always-current, visually clean organigram that requires no manual diagram maintenance — just fetch, review, and share.

**Core Principles:**

1. **Separation of concerns** — Data fetching, web rendering, and PDF generation are independent modules, each testable without the others.
2. **Portability** — The organigram is stored as a plain JSON file that can be uploaded, downloaded, and versioned independently of the application.
3. **Simplicity** — The UI should be usable by non-technical staff; no coding required to update or export the organigram.
4. **Configurability** — All filtering and display rules live in a `config.json` that is editable from the UI, not hardcoded.
5. **Clean output** — Both the web view and the PDF should be visually polished and compact; the PDF must be printable and shareable without further editing.

---

## 3. Target Users

### Primary Persona: Church Administrator / Geschäftsführer

- **Who:** Staff member responsible for maintaining organisational documentation; likely one or two people per church.
- **Technical comfort:** Medium — comfortable with web apps, not a developer.
- **Key needs:**
  - Trigger a fresh fetch from ChurchTools with one click
  - Download a print-ready PDF to share with leadership
  - Adjust which groups appear (filter config) without editing code

### Secondary Persona: Ministry Leader / Bereichsleiter

- **Who:** Leader of a specific ministry area who wants to view the structure of their teams.
- **Technical comfort:** Low to medium — just a web browser.
- **Key needs:**
  - View the current organigram in the browser
  - Expand/collapse sections to focus on their area
  - (Future) Click a person to see all groups they lead

### Technical Persona: Self-Hoster / Developer

- **Who:** The person deploying and maintaining the application (likely the same person as the administrator in a small church).
- **Technical comfort:** High — comfortable with Docker, `.env` files, JSON.
- **Key needs:**
  - Simple Docker deployment
  - Clear config file format
  - Credentials kept out of the UI for security

---

## 4. MVP Scope

### In Scope

**Core Functionality:**
- ✅ Fetch organisational data from ChurchTools API (groups, persons, memberships, hierarchies)
- ✅ Filter groups by root group type IDs and relevant group type IDs
- ✅ Filter groups by include/exclude tags
- ✅ Attach leaders and (optionally) co-leaders to group nodes
- ✅ Save filtered organigram as `organigram.json`
- ✅ Display interactive organigram in the browser with expand/collapse
- ✅ Upload a saved `organigram.json` file
- ✅ Download the currently loaded organigram as a JSON file
- ✅ Download the organigram as an SVG file (full tree, client-side)
- ✅ Edit `config.json` from within the UI
- ✅ Dark / light / system theme for the web UI
- ✅ Confirm dialog before overwriting existing `organigram.json` on re-fetch
- ✅ Display persons as leader badges on their group node

**Technical:**
- ✅ TypeScript throughout (strict mode)
- ✅ Hono backend + Vite + Vue 3 + Vuetify frontend
- ✅ Single Docker container deployment
- ✅ Shared types between server and client
- ✅ Module A (fetcher) and Module B (renderer) independently testable

**Integration:**
- ✅ ChurchTools REST API (cookie-based session auth)

**Deployment:**
- ✅ Dockerfile + `docker-compose.yml`
- ✅ Credentials via `.env` only
- ✅ `data/` volume for persistent `organigram.json` and `config.json`

### Out of Scope

**Deferred to future phases:**
- ❌ Multiple filter profiles / saved views
- ❌ Click a person to highlight all groups they lead
- ❌ Fetch and propose available group types dynamically from ChurchTools
- ❌ User accounts / per-user organigrams
- ❌ Scheduled automatic re-fetch
- ❌ ChurchTools credentials editable in the UI
- ❌ GraphML / yEd export
- ❌ Embed in other pages (iframe)
- ❌ Role/permission management beyond Traefik + Authelia
- ❌ PDF export
- ❌ Multi-language UI

---

## 5. User Stories

**US-1:** As an administrator, I want to click "Fetch from ChurchTools" and have the organigram updated automatically, so that I don't have to manually maintain diagrams.
> *Example: Administrator clicks "Fetch", confirms the overwrite dialog, waits ~5 seconds, and the updated organigram appears in the browser.*

**US-2:** As an administrator, I want to download the current organigram as a JSON file, so that I can archive it or share it with another instance of the app.
> *Example: Administrator clicks "Download JSON", and `organigram.json` is saved to their downloads folder.*

**US-3:** As an administrator, I want to upload a previously saved organigram JSON file, so that I can restore an older snapshot or load data fetched by someone else.
> *Example: Administrator clicks "Upload JSON", selects a file, and the organigram in the browser updates immediately.*

**US-4:** As an administrator, I want to edit the filter configuration (group type IDs, role IDs, tags, co-leader toggle) from within the UI, so that I don't need server access to change what appears in the organigram.
> *Example: Administrator opens the Config editor, adds a group type ID to `relevantGroupTypeIds`, saves, then re-fetches to see the updated result.*

**US-5:** As a ministry leader, I want to expand and collapse branches of the organigram, so that I can focus on my area without being overwhelmed by the full structure.
> *Example: Leader collapses all top-level nodes except "Worship", then expands "Worship" to see its sub-teams and their leaders.*

**US-6:** As an administrator, I want to download the organigram as an SVG file, so that I can embed it in documents or open it in a vector graphics editor.
> *Example: Administrator clicks "Download SVG", and the full organigram tree (all nodes expanded) is downloaded as an `.svg` file instantly.*

**US-7:** As a user, I want the app to respect my system dark/light mode preference, so that I can use it comfortably in any environment.
> *Example: User's OS is in dark mode; the organigram app loads in dark mode automatically. They can override this in the config.*

**US-8 (Technical):** As a developer, I want to run the ChurchTools fetcher module independently with a mock config, so that I can verify the data transformation logic without needing a live ChurchTools instance.
> *Example: Developer runs `npm run test:fetcher` with fixture data and confirms the output matches the expected `OrgChartFile` structure.*

---

## 6. Core Architecture & Patterns

### High-Level Architecture

```
┌──────────────────────────────────────────────────────────┐
│                    Docker Container                       │
│                                                          │
│  ┌───────────────────────────────────────────────────┐   │
│  │              Hono Server (Node.js)                │   │
│  │                                                   │   │
│  │  ┌──────────────┐  ┌───────────────────────────┐  │   │
│  │  │  API Routes  │  │  Static File Server       │  │   │
│  │  │  /api/*      │  │  (Vite production build)  │  │   │
│  │  └──────┬───────┘  └───────────────────────────┘  │   │
│  │         │                                          │   │
│  │  ┌──────┴─────────────────────────────────────┐   │   │
│  │  │              Services                       │   │   │
│  │  │  ┌──────────────────────┐  ┌────────────┐  │   │   │
│  │  │  │      Module A        │  │   Config   │  │   │   │
│  │  │  │  ChurchTools Fetcher │  │   Service  │  │   │   │
│  │  │  └──────────────────────┘  └────────────┘  │   │   │
│  │  └────────────────────────────────────────────┘   │   │
│  └───────────────────────────────────────────────────┘   │
│                                                          │
│  ┌───────────────────────────────────────────────────┐   │
│  │                data/ volume                       │   │
│  │   organigram.json          config.json            │   │
│  └───────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────┘
         ▲                              ▲
         │ HTTPS (Traefik + Authelia)   │ ChurchTools API
         │                              │
      Browser                    ChurchTools instance
  (Vue 3 + Vuetify)
         │
    ┌────┴─────────────────────────────────────────────┐
    │              Module B (Vue 3 + Vuetify SPA)      │
    │   d3-org-chart renderer + Config editor UI       │
    └──────────────────────────────────────────────────┘
```

### Directory Structure

```
churchtools-organigram/
├── src/
│   ├── server/
│   │   ├── index.ts                  # Hono app entry point
│   │   ├── routes/
│   │   │   ├── organigram.ts         # GET, POST (upload), GET /download
│   │   │   ├── fetch.ts              # POST /fetch (trigger ChurchTools fetch)
│   │   │   └── config.ts             # GET, PUT /config
│   │   └── services/
│   │       ├── churchtools.ts        # Module A: fetcher + transformer
│   │       └── config.ts             # Read/write config.json
│   ├── client/
│   │   ├── main.ts                   # Vite + Vue app entry
│   │   ├── App.vue                   # Root component (layout, theme provider)
│   │   ├── components/
│   │   │   ├── OrgChart.vue          # Module B: d3-org-chart wrapper
│   │   │   ├── Toolbar.vue           # Fetch / Upload / Download JSON / Download SVG buttons
│   │   │   ├── ConfigEditor.vue      # Config editor form (Vuetify inputs)
│   │   │   └── ConfirmDialog.vue     # Overwrite confirmation dialog
│   │   ├── composables/
│   │   │   ├── useOrganigram.ts      # Fetch, upload, download organigram
│   │   │   └── useConfig.ts          # Read/write config
│   │   └── plugins/
│   │       └── vuetify.ts            # Vuetify setup (theme, icons)
│   └── shared/
│       └── types.ts                  # Shared TypeScript types (OrgChartFile, OrgNode, etc.)
├── data/
│   ├── organigram.json               # Persisted organigram (Docker volume)
│   └── config.json                   # App configuration (Docker volume)
├── .env                              # ChurchTools credentials (never committed)
├── .env.example
├── Dockerfile
├── docker-compose.yml
├── vite.config.ts
├── tsconfig.json
└── package.json
```

### Key Design Patterns

1. **Module isolation** — The two modules (fetcher, renderer) share only `src/shared/types.ts`. Each can be unit-tested with fixture data.
2. **Config-driven filtering** — All filtering logic reads from `config.json` at runtime; no filter logic is hardcoded.
3. **File-based persistence** — `organigram.json` and `config.json` live in a Docker volume. No database required.
4. **Client-side SVG export** — d3-org-chart's `exportSvg()` handles SVG download entirely in the browser; no server round-trip needed.
5. **Single container** — Hono serves both the API and the Vite-built SPA as static files from one process.

---

## 7. Features

### 7.1 ChurchTools Data Fetcher (Module A)

Reads `.env` for credentials and `config.json` for filter rules. Calls four ChurchTools API endpoints, applies filters, and returns an `OrgChartFile`.

**Filter logic:**
```
Include a group if:
  (groupTypeId is in relevantGroupTypeIds OR group has an includeTag)
  AND group does NOT have an excludeTag

Root nodes:
  Groups whose groupTypeId is in rootGroupTypeIds
  (these become the top-level nodes; their descendants are included
   if they pass the filter above)
```

**Steps:**
1. POST `/login` — cookie-based session
2. GET `/groups` — all groups
3. GET `/persons?limit=500` — all persons
4. GET `/groups/members` — person-to-group role assignments
5. GET `/groups/hierarchies` — parent/child relationships between groups
6. Filter groups per logic above
7. Build flat `OrgNode[]` with `parentId` references
8. Attach leaders (roleId in `leaderRoleIds`) and co-leaders (roleId in `coLeaderRoleIds`, only if `showCoLeaders: true`) as embedded arrays on each node
9. Return `OrgChartFile`

### 7.2 Interactive Organigram Renderer (Module B)

Client-side Vue 3 + Vuetify SPA using `d3-org-chart`. Receives an `OrgChartFile` and renders the tree. Vuetify provides the component library (app shell, toolbar, dialogs, form inputs, icons). `d3-org-chart` is mounted inside an `OrgChart.vue` component and manages its own SVG DOM.

**Features:**
- Expand/collapse subtrees (click on a node)
- Leaders displayed as name badges on the group node
- Co-leaders displayed as secondary badges (when `showCoLeaders` is true)
- Dark / light / system theme via Vuetify's theming — persisted in `config.json`
- Responsive layout within the browser viewport
- Toolbar: Fetch from ChurchTools, Upload JSON, Download JSON, Download SVG

### 7.3 Config Editor

A `ConfigEditor.vue` component using Vuetify form inputs that reads and writes `config.json` via the API. Array fields (IDs, tags) are rendered as dynamic chip inputs — type a value and press Enter to add it to the list; click × on a chip to remove it.

**Editable fields:**
- `rootGroupTypeIds` — numeric IDs of root group types
- `relevantGroupTypeIds` — numeric IDs of included group types
- `leaderRoleIds` — role IDs that count as leaders
- `coLeaderRoleIds` — role IDs that count as co-leaders
- `showCoLeaders` — toggle switch
- `includeTags` — tags that force-include a group
- `excludeTags` — tags that force-exclude a group
- `theme` — select: `"light"` | `"dark"` | `"system"`

Changes are saved to `config.json` on the server when the user clicks Save. A re-fetch is required for filter changes to take effect in the organigram.

### 7.4 SVG Export

Client-side export using d3-org-chart's built-in `exportSvg()` method. No server round-trip required.

**Behaviour:**
- `chart.expandAll()` is called before export so the SVG contains the full tree regardless of current collapse state
- Collapse state is restored after export
- File downloads as `organigram.svg` directly from the browser

---

## 8. Technology Stack

### Backend
| Technology | Version | Purpose |
|---|---|---|
| **Node.js** | 20.x LTS | Runtime |
| **Hono** | 4.x | HTTP server framework (TypeScript-first, lightweight) |
| **@hono/node-server** | latest | Node.js adapter for Hono |

### Frontend
| Technology | Version | Purpose |
|---|---|---|
| **Vite** | 5.x | SPA bundler + dev server |
| **Vue 3** | 3.x | Reactive component framework (Composition API) |
| **Vuetify** | 3.x | Material Design component library (app shell, forms, dialogs, theming) |
| **TypeScript** | 5.x | Type safety (strict mode) |
| **d3-org-chart** | 3.x | Interactive org chart rendering (MIT, SVG-based) |

### Shared
| Technology | Purpose |
|---|---|
| **TypeScript** | Shared types between server and client (`src/shared/types.ts`) |
| **zod** | Runtime validation of config.json, uploaded files, API inputs |

### Dev Tooling
| Tool | Purpose |
|---|---|
| **Vitest** | Unit testing for both modules |
| **tsx** | TypeScript execution for dev server |

### Deployment
| Technology | Purpose |
|---|---|
| **Docker** | Single-container deployment |
| **docker-compose** | Local and production orchestration |
| **Traefik + Authelia** | Reverse proxy + authentication (external, not in this repo) |

---

## 9. Security & Configuration

### Credentials (`.env`)

ChurchTools credentials are provided exclusively via environment variables. They are never exposed in the UI, never written to `config.json`, and never included in the Docker image.

```env
CT_BASEURL=https://example.church.tools
CT_EMAIL=admin@example.com
CT_PASSWORD=secret
```

### Config file (`data/config.json`)

```json
{
  "rootGroupTypeIds": [4],
  "relevantGroupTypeIds": [4, 7],
  "leaderRoleIds": [1, 2],
  "coLeaderRoleIds": [3],
  "showCoLeaders": true,
  "includeTags": ["organigram"],
  "excludeTags": ["organigram-exclude"],
  "theme": "system"
}
```

### Security scope

**In scope:**
- ✅ Credentials via `.env` only — never in config or UI
- ✅ Input validation (zod) on all API endpoints
- ✅ Uploaded JSON validated against `OrgChartFile` schema before acceptance
- ✅ Config values validated before writing to disk

**Out of scope (handled externally):**
- ❌ Authentication — delegated to Traefik + Authelia
- ❌ HTTPS termination — handled by Traefik
- ❌ Per-user access control

### Deployment

```yaml
# docker-compose.yml (simplified)
services:
  organigram:
    build: adr
    volumes:
      - ./data:/app/data
    env_file: .env
    ports:
      - "3000:3000"
```

The `data/` directory is mounted as a volume so `organigram.json` and `config.json` persist across container restarts.

---

## 10. API Specification

All routes are prefixed with `/api`.

### Organigram

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/organigram` | Return current `organigram.json` as JSON |
| `POST` | `/api/organigram` | Accept uploaded `OrgChartFile` JSON body, validate, write to disk |
| `GET` | `/api/organigram/download` | Return `organigram.json` as a file download (`Content-Disposition: attachment`) |

### ChurchTools Fetch

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/api/fetch` | Fetch from ChurchTools using `.env` credentials + current `config.json`. Returns the new `OrgChartFile` without saving it. Client confirms, then calls `POST /api/organigram` to persist. |

**Response:**
```json
{ "data": { /* OrgChartFile */ } }
```

### Config

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/config` | Return current `config.json` |
| `PUT` | `/api/config` | Validate and write new config |

---

## 11. Shared Data Types

```typescript
// src/shared/types.ts

export interface OrgChartFile {
  schemaVersion: "1";
  generatedAt: string;          // ISO-8601 timestamp
  source: "churchtools" | "upload";
  nodes: OrgNode[];
}

export interface OrgNode {
  id: string;                   // "group-{churchtools_id}"
  parentId: string | null;      // null for root nodes
  name: string;                 // Group display name
  groupTypeId: number;          // ChurchTools group type ID
  leaders: Person[];
  coLeaders: Person[];
}

export interface Person {
  id: number;                   // ChurchTools person ID
  firstName: string;
  lastName: string;
}

export interface AppConfig {
  rootGroupTypeIds: number[];
  relevantGroupTypeIds: number[];
  leaderRoleIds: number[];
  coLeaderRoleIds: number[];
  showCoLeaders: boolean;
  includeTags: string[];
  excludeTags: string[];
  theme: "light" | "dark" | "system";
}
```

---

## 12. Success Criteria

### MVP Success Definition

The MVP is complete when an administrator can open the app, trigger a ChurchTools fetch, view the resulting organigram interactively in the browser, adjust the config from the UI, and download the organigram as SVG — all from a single Dockerised container.

### Functional Requirements

- ✅ Fetching from ChurchTools produces a valid `OrgChartFile`
- ✅ Filter logic correctly applies rootGroupTypeIds, relevantGroupTypeIds, includeTags, excludeTags
- ✅ Leaders and (when enabled) co-leaders are correctly attached to group nodes
- ✅ Organigram renders in the browser as an interactive tree
- ✅ Expand/collapse works on all nodes
- ✅ Persons are displayed as badges on their group node
- ✅ Upload JSON replaces the current organigram
- ✅ Download JSON returns a valid `OrgChartFile`
- ✅ Config editor reads and writes all fields
- ✅ SVG export downloads the full tree (all nodes expanded) as `organigram.svg`
- ✅ Dark/light/system theme works and persists in config
- ✅ Confirm dialog appears before overwriting organigram.json
- ✅ App runs in a single Docker container with a `data/` volume

### Quality Indicators

- TypeScript strict mode, zero type errors
- Both modules independently unit-testable with fixture data
- Zod validation on all API inputs
- No ChurchTools credentials exposed in any API response, log, or config

---

## 13. Implementation Phases

### Phase 1: Core Data Pipeline + API

**Goal:** Module A is working and tested. Hono API is running. `organigram.json` can be fetched, read, uploaded, and downloaded.

**Deliverables:**
- ✅ Project scaffold: Hono + Vite + TypeScript, shared types, monorepo structure
- ✅ Docker + `docker-compose.yml` skeleton
- ✅ `src/shared/types.ts` — `OrgChartFile`, `OrgNode`, `Person`, `AppConfig`
- ✅ `data/config.json` — default config
- ✅ Module A: ChurchTools fetcher service (login, fetch 4 endpoints, filter, transform)
- ✅ `POST /api/fetch` — runs Module A, returns `OrgChartFile`
- ✅ `GET /api/organigram` — returns saved organigram
- ✅ `POST /api/organigram` — validates and saves organigram
- ✅ `GET /api/organigram/download` — file download
- ✅ `GET /api/config` + `PUT /api/config` — config CRUD
- ✅ Unit tests for Module A with fixture data

**Validation:**
- `POST /api/fetch` with real `.env` returns a valid `OrgChartFile`
- Filter logic unit tests pass with fixture data (correct nodes included/excluded)
- Organigram survives container restart (Docker volume)

---

### Phase 2: Interactive Web Renderer

**Goal:** Module B is working. The SPA loads the organigram and renders it interactively.

**Deliverables:**
- ✅ Vite + Vue 3 + Vuetify SPA scaffolded and served by Hono
- ✅ Module B: `OrgChart.vue` wrapping `d3-org-chart` — loads `OrgChartFile`, renders tree
- ✅ Expand/collapse on click
- ✅ Leader badges on group nodes (co-leader badges when `showCoLeaders` is true)
- ✅ Toolbar: Fetch (with confirm dialog), Upload JSON, Download JSON, Download SVG
- ✅ Config editor panel: all `AppConfig` fields editable and saved via `PUT /api/config`
- ✅ Dark/light/system theme applied to UI
- ✅ Unit tests for chart data transformation (OrgNode → d3-org-chart node format)

**Validation:**
- Full organigram visible and interactive in browser
- Expand/collapse works correctly
- Config changes save and persist
- Theme toggle works

---

### Phase 3: Docker Polish + End-to-End Testing

**Goal:** Application is production-ready in Docker, all paths tested end-to-end.

**Deliverables:**
- ✅ Optimised multi-stage Dockerfile (build stage + runtime stage)
- ✅ `docker-compose.yml` with data volume, env_file, and port mapping
- ✅ `.env.example` with all required variables documented
- ✅ Default `config.json` included in image (overridden by volume)
- ✅ End-to-end test: fetch → render → SVG download with fixture/mock ChurchTools server
- ✅ Error handling: ChurchTools unreachable, invalid credentials, malformed upload

**Validation:**
- `docker compose up` starts successfully from a fresh clone
- Full workflow (fetch → view → config edit → SVG download) works in Docker

---

## 14. Future Considerations

### Post-MVP Enhancements

- **Person highlight** — Click a person badge to highlight all group nodes where that person is a leader
- **Dynamic group type discovery** — Fetch available group type IDs from ChurchTools and propose them in the config editor
- **Multiple views / filter profiles** — Save and switch between named filter configurations
- **Scheduled fetch** — Cron-triggered automatic refresh (e.g. nightly)
- **ChurchTools credentials in UI** — With proper secrets handling (not plain config.json)

### Integration Opportunities

- **GraphML export** — For use in yEd or Gephi (re-use existing proof-of-concept logic)
- **ChurchTools webhooks** — Trigger a refresh when group data changes, if supported by the API
- **Embeddable widget** — Iframe-embeddable organigram for internal portals

### Advanced Features

- **PDF export** — Server-side or client-side (jsPDF + svg2pdf.js) for print-ready output
- **Image nodes** — Show profile photos from ChurchTools on person badges
- **Search / filter in UI** — Highlight nodes matching a search term

---

## 15. Risks & Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| **ChurchTools API pagination** — `/persons?limit=500` may not return all persons in large churches. | Medium | Check `meta.pagination` in the API response and fetch additional pages if `totalCount > limit`. Handle this in Module A. |
| **d3-org-chart maintenance** — Last published ~3 years ago; 137 open issues on GitHub. | Low–Medium | The library is MIT and the codebase is small enough to fork if needed. ApexTree.js is a documented fallback. |
| **Large group trees** — Churches with 50+ groups may produce organigrams that are hard to read on screen. | Medium | SVG export scales infinitely; users can zoom in a vector editor. For very large trees, a future subtree export could be added. |
| **Config edits breaking the filter** — An administrator entering an invalid group type ID could result in an empty organigram. | Low | Validate config on write (zod). Show a warning if the resulting organigram would have zero root nodes, but don't block the save. |

---

## 16. Appendix

### Key Dependencies

| Package | Purpose |
|---|---|
| `hono` | HTTP framework |
| `@hono/node-server` | Node.js adapter |
| `vite` | Frontend bundler |
| `vue` | Reactive component framework |
| `vuetify` | Material Design component library |
| `@mdi/font` | Material Design icons (used by Vuetify) |
| `d3-org-chart` | Org chart renderer + SVG export |
| `zod` | Runtime schema validation |
| `dotenv` | `.env` loading |
| `vitest` | Unit testing |

### Existing Reference Code

The original proof-of-concept in `app/` demonstrates:
- ChurchTools login + 4 API endpoint calls
- Role-based person filtering via `LEADER_GROUP_TYPE_ROLE_IDS`
- Recursive group tree traversal
- GraphML output for yEd

This code is used as a reference only. The new implementation will supersede it entirely.

### ChurchTools API Endpoints Used

| Endpoint | Method | Purpose |
|---|---|---|
| `/login` | POST | Cookie-based session authentication |
| `/groups` | GET | All groups with name and type |
| `/persons` | GET | All persons (paginated) |
| `/groups/members` | GET | Person-to-group role assignments |
| `/groups/hierarchies` | GET | Parent/child relationships between groups |
