import { analyzeTextLocally } from './localAnalysis';
import { LocalProcessingUnavailableError, type LocalProcessingInput, type LocalProcessingResult } from './localDocumentProcessor.types';

export { LocalProcessingUnavailableError } from './localDocumentProcessor.types';

export async function processDocumentLocally(input: LocalProcessingInput): Promise<LocalProcessingResult> {
  if (input.signal?.aborted) throw new DOMException('Local processing was cancelled.', 'AbortError');
  if (input.mimeType !== 'text/plain') {
    throw new LocalProcessingUnavailableError('Image and PDF OCR currently runs locally in the ActionLens website. Open the web app in Chrome to process this file without an AI API.');
  }
  input.onProgress?.('reading', 1);
  const pages = [{ pageNumber: 1, text: new TextDecoder().decode(input.bytes) }];
  input.onProgress?.('analyzing', 0);
  const analysis = analyzeTextLocally(pages, input.fileName);
  input.onProgress?.('analyzing', 1);
  return { pages, analysis };
}
