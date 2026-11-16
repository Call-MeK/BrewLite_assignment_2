# SGU report identity alignment

## Intent

Make the BrewLite AS1 and AS2 PDFs visually conform to the supplied SGU
assignment template without changing their verified content or claims.

## Scope and constraints

- Replace the coffee-themed cover treatment with the supplied SGU IT logo and
  blue template identity.
- Apply the template's blue to report headings, links, rules, header and
  footer; retain neutral black body text.
- Preserve the existing lecturer (Từ Lãng Phiêu), group (05), content, figures
  and AS1 six-page limit.
- Do not alter application code, data, screenshots, facts or secrets.

## Approaches considered

1. Copy the full legacy template layout. Rejected: its obsolete page geometry
   and typography would reflow both reports unpredictably.
2. Apply only the blue colour. Rejected: it would still omit the logo and SGU
   header/footer that make the template recognizable.
3. Adapt the template identity to the established report layout. Selected:
   this changes the cover, logo, blue palette, header and footer while keeping
   the verified report structure stable.

## Verification

Compile AS1 and AS2 twice with pdfLaTeX; confirm AS1 remains six pages, all
figure paths resolve, and inspect the regenerated cover and representative
content pages visually.
