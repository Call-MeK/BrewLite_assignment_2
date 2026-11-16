****# SGU Report Identity Alignment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Align both BrewLite report PDFs with the supplied SGU assignment-template identity.

**Architecture:** Keep all shared typography and identity rules in `preamble.tex` so AS1 and AS2 compile from the same source. Reuse the supplied SGU logo as a local report asset and retain the reports' existing content and figures.

**Tech Stack:** pdfLaTeX, vntex, TikZ, fancyhdr.

**Spec:** `docs/superpowers/specs/2026-11-15-sgu-report-identity-design.md`

## Global Constraints

- Preserve the lecturer Từ Lãng Phiêu and group 05 cover fields.
- Preserve all verified report content, figures and application code.
- AS1 must remain six pages.
- Add no dependency and expose no secret.

## Review Focus

- The logo asset path must resolve when compiling from `docs/report/`.
- Header/footer must remain legible after blue identity rules replace the coffee palette.
- Cover changes must not alter the AS1 page count.
- Existing `\pass`/`\partialok` semantic colours must remain distinguishable.
- Both PDFs must retain embedded Vietnamese glyphs.

---

### Task 1: Adapt shared report identity

**Files:**
- Create: `docs/report/assets/logoITSGU.png`
- Modify: `docs/report/preamble.tex`
- Modify: `docs/report/as1.pdf`
- Modify: `docs/report/as2.pdf`

**Interfaces:**
- Consumes: template asset `docs/Assigment_template_SGU (1)/Assigment_template_SGU/logoITSGU.png`.
- Produces: unchanged `\makecover`, `\RunningHead`, `\pass`, `\partialok` interfaces used by both reports.

- [ ] **Step 1: Add the supplied SGU IT logo as a report asset**

Copy it to `docs/report/assets/logoITSGU.png` so report compilation never depends on the untracked template directory.

- [ ] **Step 2: Update the shared preamble identity**

Replace the coffee cover drawing with the SGU logo and blue template layout; apply SGU blue to headings, rules, header/footer and hyperlinks while keeping body copy black.

- [ ] **Step 3: Compile both reports twice**

Run: `pdflatex -interaction=nonstopmode -halt-on-error as1.tex` twice and the equivalent AS2 command from `docs/report/`.

Expected: exit code 0; AS1 has six pages; AS2 has no LaTeX errors or unresolved figures.

- [ ] **Step 4: Visually inspect generated cover and representative content pages**

Render page 1 of both reports and one body page; confirm the SGU logo/blue identity appears and no content is clipped.

- [ ] **Step 5: Commit**

```bash
git add docs/report
git commit -m "docs: align reports with SGU template"
```

## Self-review

The single task covers the selected identity approach, uses a stable local logo copy, and verifies the page-count and rendering constraints. No application callers, tests, fixtures or production configuration change.
