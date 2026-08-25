# Local OCR and Analysis Pipeline

## Local processing boundary

The production website uses self-hosted Tesseract.js for image OCR and PDF.js for PDF text extraction/page rendering. Tesseract’s worker, WebAssembly core, and English language data are copied into `public/local-ocr` during the web build and served by the same deployment.

Normalized text is analyzed with deterministic local rules in `src/services/ai/localAnalysis.ts`. The result must pass the shared Zod extraction schema before it is saved. No document content is sent to an AI, OCR, or model API.

## Evidence rules

Every deadline, action, requirement, payment, contact, location, eligibility condition, link, and warning has:

- a confidence category: `high`, `review_recommended`, or `uncertain`;
- exact supporting source text;
- a page number where applicable;
- optional OCR bounding geometry.

Conflicting dates remain separate findings and generate a warning. Ambiguous relative dates are not converted into exact dates unless the anchor is explicit.

## Analysis boundary

Source text is untrusted data, not executable instructions. The analyzer only applies fixed date, action, requirement, payment, contact, location, eligibility, link, and warning rules. The extraction schema uses bounded arrays and strings; invalid results make the processing job recoverably failed.

## Resource controls

- OCR a content hash only once per user.
- Persist normalized text and analysis version.
- Cap bytes, PDF pages, canvas pixels, characters, and output items.
- Reuse one OCR worker for scanned pages within a PDF and release it after processing.
- Keep provider request ids, token counts, and estimated model cost at zero.
- Reject HEIC/HEIF with a clear JPG/PNG conversion message when the browser cannot decode it locally.

## Verification

Local analysis output is stored as a draft extraction only. User edits are validated again before a database transaction creates official obligations. Local analysis never schedules reminders directly.
