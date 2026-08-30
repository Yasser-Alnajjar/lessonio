# Frontend-Only Report Generation for ExportReport

## Context

`ExportReport.tsx` (`src/modules/dashboard/projects/project/csr/ExportReport.tsx`) currently POSTs the user's options to a backend endpoint that renders and returns a binary `.docx`/`.pptx`. The goal is to move all file generation into the browser: the backend should only hand back structured JSON; the frontend normalizes it into a generic model and renders the actual document (DOCX now, PPTX isolated for the same follow-up) client-side, reproducing the visual design of the two reference reports (`FA_Findings_Report_Network_Team.docx`, `FA_Findings_Report_System_Team.docx`) the user supplied.

Research already completed (grounded in code, not guesses):

- **Frontend**: `ExportReport.tsx` (473 lines) does raw `fetch()` (bypassing the project's `Actions`/axios convention), has `preview: any`, and a local `ReportSection` type only used for UI labels. No `docx`/`pptxgenjs` installed; `echarts`/`echarts-for-react` are. `useTranslate` (`@hooks`) and `useDirection` (`@hooks`) exist and should be used (the component currently imports `useTranslations` from `next-intl` directly and raw `sonner` toast — both inconsistent with the rest of the codebase, worth fixing in passing).
- **Backend** (`falcon-backend`, Go/Gin/Elasticsearch): `POST /reports/generate` already accepts `format: "json"` and, in that case, returns the raw `ReportData` struct (`Project`, `Policies`, `Controls`, `Violations`, `Comments`, `Evidence`, `Risks`, `Assets`, `Summary`, `GeneratedAt`, `TimeFrame`) **without touching any binary renderer** — `internal/handlers/report_handlers.go:127-131`. **No backend changes are needed.** Two known backend gaps to design around instead of fixing server-side (per the user's "don't change the backend unnecessarily" instruction):
  - `time_frame`/`start_date`/`end_date` are accepted but never actually filter the query server-side — the backend always returns the full unfiltered dataset per section.
  - `include_charts` is parsed but unused.
    Both are solvable entirely on the frontend: since the backend already returns the **full** dataset, `normalizeReportData()` can apply the time-frame filter itself (using each item's `created_at`/`detected_at`), and charts are generated client-side regardless.
  - Field-name drift exists between the Go model and actual ES documents (e.g. a comment may have `text`/`message`, `author`/`author_email`) — the normalizer must read defensively (`??` chains), not trust one field name.
  - There is no "Network report" vs "System report" concept anywhere in the backend or frontend — the two reference DOCX files are the same underlying report shape (audit-style findings) applied to different projects. The generic renderer naturally covers both; no per-type branching is needed.
- **Reference DOCX visual analysis** (rendered to images and inspected via unzipped OOXML): both reference files share **byte-identical colors** (confirmed via `w:fill`/`w:color` extraction) — navy `#1F3864` (table header/label cells), cream `#FBF6EC` (value cells), heading blue `#2A3890`, severity colors High `#ED7D31` / Medium `#FFC000` / Low `#70AD47`. Fonts differ only because the two files were exported from different Word template defaults (Cambria/Calibri vs. Aptos) — not an intentional per-report-type design choice, so the generic renderer will standardize on one font pairing rather than branch on it.
  - **Cover page**: diagonal navy/blue gradient graphic (left edge), "The Financial Academy" title, "SECURITY CONFIGURATION FINDINGS REPORT" subtitle, team/report-title line.
  - **Document Control** page: heading + 4-column table (Version/Date/Author/Description), navy header row, white bold text.
  - **Executive Summary**: narrative paragraph, "Key findings requiring attention" bullets, a Severity/Findings/Share table (row-shaded by severity), and two charts side-by-side (severity donut + top-findings horizontal bar).
  - **Detailed Findings**: repeated "Finding N: `<title>`" (H2) each followed by a label/value table — rows: Severity (shaded), NCA ECC Control, Source, Data Collected, Instances, Affected Objects/Hosts (wrapped list), Issue, Evidence (Proof), Risk/Impact, Recommendation. Label cells are navy w/white text, value cells cream.
  - Network report additionally has a **Published Services** table (VIPs/inbound rules pending PT/VA) — there is no corresponding concept in the current backend data model (no PT/VA fields anywhere), so per the "don't fake data" rule this table is **not** reproduced; noted as a gap rather than invented.
  - **Conclusion & Recommendations** (numbered list) and **Notes & Methodology** (bullets).
  - **Footer**: logo mark + `www.fa.org.sa` + rule + "Page N"; centered "FINANCIAL ACADEMY / CONFIDENTIAL" line below. Page numbers start on the Document Control page (cover has none).

### Key design decision: `ReportItem.fields` as label/value pairs

The reference "Finding" tables (Severity/NCA Control/Source/.../Recommendation) and the reference "Document Control" table are structurally the same thing: a set of ordered label→value rows. Modeling every section (`policies`, `controls`, `violations`, `comments`, `evidence`, `risks`, `assets`) as items with a generic `fields: { label: string; value: string }[]` lets **one renderer function** draw every section's table with zero `if (section === "violations")` branching — the normalizer decides which fields exist per section (e.g. violations get "NCA ECC Control"/"Instances"/"Affected Objects", policies get "Owner"/"Version"/"Published"), the renderer just iterates. This directly satisfies the "avoid `NetworkReportRenderer`/`SystemReportRenderer`, data determines what gets rendered" requirement.

For **violations specifically**, the normalizer groups raw violation documents by title (matching how the reference "Finding N" blocks aggregate many affected hosts/policies under one rule name) — this is a normalizer-level transform, not a renderer concern.

## Files

### Types — `src/lib/types/report.ts` (new)

- `ReportOptions` (selectedSections, timeFrame, startDate?, endDate?, reportTitle, includeCharts, format)
- `BackendReportResponse` — loosely-typed mirror of the Go `ReportData` struct (`Record<string, unknown>` arrays per section + `project`/`summary`/`generated_at`/`time_frame`), since the real ES documents aren't schema-enforced server-side. No `any`.
- `ReportData`, `ReportMetadata`, `ReportSummary` (counts + `controlsByStatus`/`violationsBySeverity`/`risksByLevel` breakdowns, mirroring the backend's `buildReportSummary`)
- `ReportSection` (`id`, `titleKey`/`title`, `items: ReportItem[]`)
- `ReportItem` (`id`, `title`, `severity?`, `status?`, `category?`, `fields: ReportField[]`, `evidence?: ReportEvidence[]`)
- `ReportField` (`label`, `value`)
- `ReportEvidence`, `ReportChart` (`id`, `title`, `type: "donut" | "bar"`, `categories: string[]`, `series: { name; value; color? }[]`)
- `ReportLabels` — the translated-strings bag threaded into the normalizer/renderer (section titles, table column labels, footer text, cover subtitle) so no user-facing string is hardcoded in generation code.

### Backend call — `src/lib/actions/project/report.ts` (new)

Follows the existing `Evidence`-style action module pattern (`src/lib/actions/project/evidence.ts`): `Report.getData(projectId, options): Promise<IResult>`, POSTing to `/api/projects/${projectId}/reports/generate` with `format: "json"` via the shared `axios` client (`@lib/client`) — replacing `ExportReport.tsx`'s manual `fetch()` + manual header-building. Registered into the global `Actions` namespace (`src/lib/actions/index.ts`) alongside `Evidence`, `Policy`, etc.

### Normalizer — `src/lib/report-generation/normalize-report-data.ts` (new)

`normalizeReportData(backendData: BackendReportResponse, options: ReportOptions, labels: ReportLabels): ReportData`

- Builds `metadata`/`summary` from `backendData.project`/`backendData.summary`.
- Applies client-side time-frame filtering (the backend gap noted above) per section using each item's best-available date field.
- Per-section item mapping: one small pure function per section (`mapPolicyItem`, `mapControlItem`, `mapViolationItem`, ... — private helpers in the same file, not separate renderer classes) that reads raw fields defensively and produces `ReportItem.fields`.
- Violation grouping-by-title with an aggregated "Affected Objects/Hosts (N)" field.
- Builds `charts: ReportChart[]` from the summary breakdowns when `options.includeCharts` is true (severity donut, top-findings-by-count bar) — empty array otherwise, so downstream code never branches on the flag again.

### Chart image pipeline — `src/lib/report-generation/charts/render-chart-image.ts` (new)

Headless PNG generation shared by DOCX and PPTX: `renderChartImage(chart: ReportChart): Promise<string>` (data URL) using the already-installed `echarts` core package — `echarts.init()` on a detached, sized, off-DOM container, `chart.getDataURL({ type: "png", pixelRatio: 2, backgroundColor: "#fff" })`, then `dispose()`. No React, no `dom-to-image` (avoids screenshotting real UI, produces a proper embeddable raster image as the spec requires). Colors reuse the severity palette from `docx/styles.ts`.

### DOCX generator — `src/lib/report-generation/docx/` (new)

- `styles.ts` — shared constants: hex colors (`NAVY = "1F3864"`, `CREAM = "FBF6EC"`, severity map, heading blue `2A3890`), font family, spacing/margins, `WidthType.DXA` table column widths, direction-aware paragraph alignment helper (`dir: "ltr" | "rtl"` param).
- `generate-docx.ts` — `generateDocx(report: ReportData, dir: "ltr" | "rtl"): Promise<Blob>`; lazy `const { Document, Packer, ... } = await import("docx")`; assembles sections via the functions below; `Packer.toBlob()`.
- `sections/cover.ts` — `renderCoverPage(report, labels)`: title, subtitle, gradient graphic reproduced via docx shape/vector drawing (or a pre-exported PNG asset if vector reproduction proves impractical — decided during implementation, documented either way).
- `sections/document-control.ts` — `renderDocumentControl(report, labels)`.
- `sections/executive-summary.ts` — `renderExecutiveSummary(report, labels)`: narrative, bullet list, severity table, side-by-side chart images (via `renderChartImage`) as `ImageRun`s when `report.charts.length`.
- `sections/section.ts` — the one generic function, `renderReportSection(section: ReportSection, labels)`, used for every one of policies/controls/violations/comments/evidence/risks/assets: heading + per-item label/value tables exactly like the reference "Finding" blocks.
- `sections/conclusion.ts` — numbered recommendations + methodology bullets (templated from `labels`, not hardcoded).
- `sections/footer.ts` — `buildFooter(labels)`: logo/text + rule + page number field, page numbers starting after the cover.
- Selected sections not in `options.selectedSections` are simply skipped by the orchestrator — no per-section `if` chains beyond "is this id in the selected set."

### PPTX generator — `src/lib/report-generation/pptx/generate-pptx.ts` (new, isolated)

`generatePptx(report: ReportData): Promise<Blob>` using `pptxgenjs` (new dependency), lazy-imported. Consumes the same `ReportData` — title slide, summary slide (severity table + the same chart images from `renderChartImage`), one slide-group per selected section rendering `ReportItem.fields` as a table. Kept functionally complete but visually simpler than the DOCX (no reference PPTX was supplied to match pixel-for-pixel); isolated in its own file/folder per the "isolate so it can be implemented without changing the architecture" fallback instruction.

### Download utility — `src/lib/report-generation/download-report.ts` (new)

`downloadBlob(blob: Blob, filename: string): void` — anchor-click + `URL.createObjectURL`/`revokeObjectURL`, no `file-saver` dependency needed.

### Component refactor

- `src/modules/dashboard/projects/project/csr/useExportReport.ts` (new) — extracts all state/handlers currently inline in `ExportReport.tsx`: `fetchReportData` (via `Actions.Report.getData`), `normalizeReportData` call, `handleExport` (branches on `format` to call `generateDocx`/`generatePptx`, lazy-imported so neither `docx` nor `pptxgenjs` cost bundle size until export is clicked), `downloadBlob`, and preview derivation. Preview counts are now computed by calling `Actions.Report.getData` once and deriving both the on-screen preview panel and the export from the **same** normalized `ReportData` — the "avoid duplicate API calls" requirement — replacing the separate `/reports/preview` call entirely.
- `src/modules/dashboard/projects/project/csr/ExportReport.tsx` (refactor in place, same file/props/export) — keeps 100% of the existing UI (title input, format toggle, time-frame select + custom dates, sections checklist, include-charts checkbox, preview panel, action buttons) untouched; only swaps its internals to call the new hook, replaces `useTranslations("project_misc")` → `useTranslate("project_misc")`, replaces raw `sonner` `toast` → the project's `useToast` (`toMessage()` for safe error rendering), and types `preview` properly instead of `any`. All error paths (no sections selected, empty data, invalid custom dates, failed fetch, generation failure, download failure) surface via `toast`.
- Translation keys: extend `messages/en.json` / `messages/ar.json` under the existing `project_misc` namespace (or a new `reports` namespace if it gets large) with the report-content strings (section titles, table column labels, footer/cover text) consumed by `ReportLabels`.

### Packages

`npm install docx pptxgenjs` — both are lazy-imported (`await import(...)`) inside the generator entry points only, so they don't load until a user actually exports, per the perf requirement.

## Data flow

```
User opens dialog → configures options (unchanged UI)
  → Actions.Report.getData(projectId, options)   [POST .../reports/generate, format:"json"]
  → normalizeReportData(backendData, options, labels)   [client-side time filtering, grouping, chart building]
  → ReportData  ── powers both the Preview panel AND ──▶ generateDocx / generatePptx (format-dependent)
                                                            → Blob → downloadBlob()
```

## Verification

- `npm run build` / `tsc --noEmit` for strict-type-safety (no `any`) across new files.
- Manual browser check via dev server: open the dialog on a real project, select all/subset of sections, try `all`/`last_30_days`/`custom` time frames, toggle `includeCharts`, export both `docx` and `pptx`, open the generated files (LibreOffice available locally) and visually diff against the reference screenshots already captured for cover/exec-summary/findings-table/footer fidelity.
- Test RTL: switch locale to `ar`, confirm dialog `dir` still works (unchanged) and exported DOCX paragraph alignment mirrors.
- Error-path check: deselect all sections (export button should stay disabled, matching current behavior), and simulate a fetch failure (e.g. throttle/offline) to confirm the new `useToast`-based messaging fires instead of an unhandled rejection.
