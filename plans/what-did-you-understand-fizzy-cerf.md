# Customer-Owned DOCX Report Template — Implementation Plan

## Context

**What you asked for.** Customers should be able to upload their own `.docx` Word file and have it become the *sole* source of truth for the exported report: which sections appear, in what order, where each piece of data lands, how it's grouped, and every aspect of formatting. The app's job shrinks to: read the DOCX → find placeholders → resolve them against report data → expand loops → inject chart images → hand back a `.docx`. No predefined headings, tables, or ordering may be injected.

**What I found that changes the shape of the work.**

1. **The feature does not exist on `main`.** Everything the original brief referred to as "existing" (`generate-docx-from-template.ts`, `template-data.ts`, `embed-chart-images.ts`, `TemplateUploadField.tsx`, the `templateFile` option, `docxtemplater`/`pizzip`) lives only on the unmerged branch `docx/template` (single commit `92333cf`). You've said not to use anything from it. So this is a **greenfield build on `main`**, not a swap of a rendering engine. Constraints from the brief like "don't modify `template-data.ts`" and "keep the existing `TemplateRenderError`" are moot — those files don't exist here; I'm authoring them fresh. `docxtemplater` and `pizzip` are not in `main`'s `package.json` at all, so there is nothing to remove.

2. **Grouping on `main` is destructive.** `groupItems()` ([normalize-report-data.ts:282](src/lib/report-generation/normalize-report-data.ts:282)) collapses N items into **one merged item per group** — comma-joining field values, dropping the grouped-on field, synthesizing an `instances` count. Renderers never see groups at all. Your requirement that *the template* define grouping therefore cannot reuse that function. The custom-template path will request ungrouped data and do **non-destructive** grouping in its own data layer, where a group keeps its real `items[]`.

3. **`groupBy` and `fields` never leave the browser.** [report.ts:15](src/lib/actions/project/report.ts:15) sends only `sections.map(s => s.id)`. So the template path can pass a different `IReportOptions` into `normalizeReportData` with zero backend impact.

4. **Good news on tooling.** `jszip@3.10.1` is already a dependency (used by the parser dialogs) — **no new package is needed**. LibreOffice 26.2 is installed at `/Applications/LibreOffice.app/Contents/MacOS/soffice` (just not on `PATH`), so real visual validation *is* possible. `bun test` works with no config.

**Outcome.** A generic, data-driven DOCX templating engine under `src/lib/report-generation/docx/template/`, plus the UI to upload a template. The existing programmatic export path (`generate-docx.ts` and everything under `docx/sections/`) is not touched — default exports keep behaving exactly as they do today, checkboxes and all.

## Decisions taken (from your answers)

- **Scope:** full vertical slice — engine, data builder, chart embedding, `IReportOptions.templateFile`, upload component, dialog UI, and `en.json`/`ar.json` keys.
- **Grouping syntax:** both flat (`{#violations_by_severity}`) and dotted (`{#violations.by_severity}`), sharing one memoized resolver.
- **Dialog UX:** when a template is uploaded, the sections/fields/group-by accordion stays visible but **disabled**, with a short note that the template controls sections, order and grouping.
- **Branch:** new branch `feat/docx-custom-template` off `main`.

## Architecture

### XML strategy — hand-rolled tokenizer, not DOMParser, not regex

Verified: **Bun 1.3.3 has no `DOMParser` or `XMLSerializer`**. Using the DOM would mean tests exercise a different code path than production, or adding a jsdom-class dependency (disallowed). Regex-over-string cannot answer structural questions like "is this `{/violations}` in the same `<w:tr>` as its opener".

The tree keeps each element's **verbatim attribute source**:

```ts
interface XmlElement { type: "element"; name: string; attrsRaw: string; selfClosing: boolean; children: XmlNode[] }
interface XmlText { type: "text"; raw: string }   // still escaped, as authored
interface XmlRaw  { type: "raw";  raw: string }   // <?xml?>, comments, CDATA
```

This makes `serializeXml(parseXml(x)) === x` byte-for-byte, which is the single most important property: regions we don't deliberately touch come out bit-identical, so Word never sees surprise normalization of `mc:AlternateContent`, `mc:Ignorable`, namespace declarations, or attribute quoting.

### Run fragmentation

Word splits `{finding_title}` across arbitrary `<w:r>/<w:t>` boundaries. Approach:

1. `readParagraphText(p)` walks the paragraph depth-first (**not** descending into nested `w:p`, so text boxes work), producing a decoded logical string plus a `slots[]` map of `{ w:t element, start, end }`. `w:br`/`w:cr` → `\n`, `w:tab` → `\t` as **barrier characters** with no slot, so a tag can never match across a structural break. `w:instrText`/`w:delText` subtrees are skipped.
2. Tags are matched against that reconstructed string, so `{fin` + `ding_` + `title}` matches as one tag.
3. `applyParagraphEdits(pt, edits)` computes all edits against **original** offsets and applies them in a single pass. The replacement value is emitted **once, into the slot containing the edit's start** ("first-run wins"); covered characters in later slots are dropped.

Critically: **no run is ever created, moved, deleted, or re-parented.** Only `w:t` character data is rewritten, with `xml:space="preserve"` set on every modified node. `<w:rPr>` survives by construction — a placeholder styled bold-red in Word yields a bold-red value. Emptied `w:t` elements are kept, not deleted, because deleting runs orphans `w:bookmarkEnd`/`w:commentRangeEnd` and corrupts the file.

### Loops

Block-structured, recursive, clone-then-render — never global string replacement. Three shapes:

- **Inline** — open and close in one paragraph; the region's rendered text is concatenated per item into that paragraph. (Documented limitation: multi-run formatting *inside* an inline loop collapses to the opening run's; block loops preserve everything.)
- **Standalone markers** — `{#tag}` alone in its paragraph; that paragraph is dropped, body is the blocks between.
- **Mixed markers** — marker shares its paragraph with content; the paragraph joins the repeated body with the tag substring spliced out.

Nesting is correct by construction: the body is deep-cloned per item and fed back through `renderBlocks` with a child scope, so an inner loop is discovered during that recursive call. Scope resolution walks current → parent → root; once a path's head segment matches a frame it commits to that frame (no cross-scope bleed). Also supports `{^tag}` inverted sections for empty-state text, and `$index`/`$number`/`$first`/`$last` meta variables.

### Table row loops

Depth-tracked rule over each `<w:tr>`'s tag stream:

- **(a) Row loop** — open and matching close both inside the same row → deep-clone the whole `<w:tr>` per item, preserving `w:trPr`, every `w:tcPr`, borders, widths, `gridSpan`, `vMerge`.
- **(b) Multi-row loop** — open in row R, close in later row R′ → body is R..R′ inclusive; rows that become marker-only after tag removal are dropped, so the common "`{#items}` in its own row above, `{/items}` below" template yields exactly N data rows.
- **(c) Boundary violation** — close not found before the table ends, or straddling a nested table → `TemplateRenderError`, no guessing.

Nested `w:tbl` is **not** descended into for depth accounting; it's handled by the recursive render of the cell contents.

### Chart images

The engine stays image-agnostic. The data builder sets `chart_image` to a sentinel `"img:<key>"`, which flows through the normal scalar path (landing in the run the user styled, e.g. centered). `` is illegal in XML 1.0 and is stripped from all *data* values, so collision is impossible.

A post-render pass then, per marker: writes `word/media/ff-chart-N.png` (prefixed + existence-checked so it can't collide with the template's own media), allocates an `rId` by scanning **all** existing ids into a Set (covers non-numeric ids like `rIdLogo`), ensures a single case-insensitive `<Default Extension="png">` in `[Content_Types].xml`, ensures `xmlns:r`/`xmlns:wp` on the part root, reads the PNG's IHDR for intrinsic size and clamps to the page's text width from `w:sectPr`, then replaces the marker run with up to three runs (before-text / `<w:drawing>` / after-text), each carrying a clone of the original `w:rPr`.

### Template data — lazy grouping via getters

`SectionView` is **an array with non-enumerable properties**, so `Array.isArray()` is true (`{#violations}` iterates items directly) while `{violations.count}` also resolves:

```ts
type SectionView = ItemView[] & { id; title; count; is_empty; items; by_severity; by_status; /* …28 lazy… */ }
```

For each of the 7 sections, 28 getters (`REPORT_FIELD_KEYS` ∪ `title`) are defined as `by_<key>` on the view *and* as root aliases `<section>_by_<key>`, both delegating to one memo. That's 392 `defineProperty` calls at build time and **zero grouping computed until a template actually reads one**. Both syntaxes you chose hit the same memo, so using both costs one computation. `Object.defineProperty` over `Proxy` — the key space is finite and known, and a proxy would complicate `in`, `Symbol.iterator`, and debugging for no gain.

Groups are non-destructive: `{ key, value, label, count, severity?, items[] }` with **the original items, unmerged** — the exact opposite of `groupItems()`.

## Files

New, under `src/lib/report-generation/docx/template/`:

| File | Responsibility |
|---|---|
| `xml/parse-xml.ts` | tokenizer, node tree, verbatim serializer, attr helpers, escaping |
| `paragraph-text.ts` | run-fragmentation: logical text ⇄ slot map, edit application, `<w:br>` expansion |
| `tags.ts` | tag grammar scanner (liberal: `{ }`, `{"json":1}`, `{{` stay literal) |
| `scope.ts` | scope chain, dotted paths, stringify, truthiness |
| `render-blocks.ts` | paragraph/nested/inverted loop engine |
| `render-table.ts` | row-loop detection + expansion |
| `dedupe-ids.ts` | post-clone uniqueness (bookmarks, `docPr`, `paraId`) |
| `docx-package.ts` | jszip open/save, part enumeration, rels + content-types helpers |
| `embed-images.ts` | sentinel → `<w:drawing>`, media/rels/content-types, EMU sizing |
| `render-part.ts` / `render-docx-template.ts` | orchestration; engine entry (DOM-free) |
| `build-template-data.ts` | `IReportData` → tag object, lazy group accessors |
| `chart-images.ts` | `IReportChart[]` → image map (browser-only; keeps engine testable) |
| `errors.ts` | `TemplateRenderError` + error-code → i18n key map |
| `index.ts` | `renderReportFromTemplate({ template, report, labels, options })` |

Modified:

- [src/lib/types/report.ts](src/lib/types/report.ts) — add `templateFile?: File | null` to `IReportOptions` (client-only, never serialized).
- [src/modules/dashboard/projects/project/csr/useExportReport.ts](src/modules/dashboard/projects/project/csr/useExportReport.ts) — add a sibling branch for `format === "docx" && templateFile`, fetching with `groupBy: "none"` and `fields: SECTION_FIELD_CATALOG[id]` so the template sees complete, ungrouped data. The existing `generateDocx`/`generatePptx` branch is untouched.
- [src/modules/dashboard/projects/project/csr/ExportReport.tsx](src/modules/dashboard/projects/project/csr/ExportReport.tsx) — `useCustomTemplate` + `templateFile` state, upload control, a collapsible placeholder reference, and disabling the sections accordion (with explanatory note) while a template is active.
- New `src/modules/dashboard/projects/project/csr/TemplateUploadField.tsx` — single-file `.docx` picker following the repo's hidden-input pattern; labels injected as props (generators/components never call `t` directly — that invariant is preserved).
- `messages/en.json` + `messages/ar.json` — new keys under the existing `project_misc` namespace (error codes, upload copy, the "template controls layout" note).

## Verification

Tests under `template/__tests__/` run with `bun test` (works with no config; the engine is DOM-free so it runs headless with a stub 1×1 PNG).

Build order, each phase gated on the previous:

0. **Fixtures** — throwaway `build-fixtures.ts` using the already-installed `docx` package: scalars, a placeholder deliberately split across three runs *with different `rPr`*, paragraph loop, nested loop, row loop, multi-row loop, header/footer, chart marker, bookmarks-in-loop, plus one genuinely Word-authored file.
1. **XML core** — `serializeXml(parseXml(x)) === x` byte-for-byte on every fixture *and* the Word-authored file. Nothing proceeds until this holds.
2. **Paragraph text** — offsets map correctly on the fragmented fixture; surviving `<w:rPr>` equals the first run's bytes exactly; escaping; `xml:space`.
3. **Tags + scope** — pure functions, including the liberal-brace cases.
4. **Block loops** — standalone vs mixed markers, nesting, empty arrays, inverted, multiple loops, scalars resolving up the chain.
5. **Table loops** — all three branches; `w:tcPr` of clone compared to original; the illegal straddle asserts a throw.
6. **Data builder** — laziness proven (grouping not invoked unless read); `violations_by_severity` and `violations.by_severity` return the same memoized reference; `sum(group.count) === items.length`.
7. **Images** — rId allocation against a fixture with `rId1..rId8` *and* `rIdLogo`; exactly one png `Default`; unique non-zero `docPr` ids.
8. **End-to-end** — render → re-open output with jszip → assert `word/document.xml`, `word/_rels/document.xml.rels`, `[Content_Types].xml` present and well-formed; no leftover `{tag}`/`{#loop}`/`{/loop}`; loop counts correct; every `r:embed` resolves to a relationship resolving to an existing media part. Plus an **identity test**: a template with no tags must render to a byte-identical `document.xml`.
9. **Visual** — convert outputs to PDF headlessly via `/Applications/LibreOffice.app/Contents/MacOS/soffice --headless --convert-to pdf` and inspect the pages: paragraphs in customer-defined positions, repeated rows correct, formatting preserved, charts present and unbroken.
10. **In-app** — run the dev server, export with a real uploaded template, confirm the default (non-template) export is unchanged.

## Top risks and mitigations

1. **Formatting loss from run fragmentation** — the naive "rebuild paragraph as one run" fix destroys exactly what the feature promises. Mitigated by never touching run structure, plus a fixture asserting the surviving `w:rPr` is byte-identical.
2. **Duplicate ids after cloning → "Word found unreadable content"** — loop bodies with bookmarks/hyperlinks/images duplicate `bookmarkStart/@id`, `docPr/@id`, `w14:paraId`. Mitigated by a `dedupeIds` pass and a bookmarks-in-loop fixture.
3. **XML round-trip infidelity** — silent normalization can make Word reject a file that opened fine before. Mitigated by the verbatim-`attrsRaw` design and the byte-equality test on a real Word file.
4. **Table row-loop misdetection** — fails silently with plausible-but-wrong output. Mitigated by the explicit depth rule, refusing to descend into nested tables, and throwing rather than guessing.
5. **Relationship/content-type drift** — colliding rIds, missing png `Default`, absolute `Target`, missing `xmlns:wp` all yield the same unhelpful Word dialog. Mitigated by full-Set id allocation, prefixed media names, and a post-render assertion that every `r:embed` resolves end-to-end.

Runner-up: a 5,000-item nested loop can hang the tab — a `nodeBudget` counter throws `too_many_iterations` instead.
