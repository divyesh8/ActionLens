import { GlobalWorkerOptions, getDocument } from 'pdfjs-dist';
import { createWorker, OEM, type Worker } from 'tesseract.js';

import { analyzeTextLocally, type LocalTextPage } from './localAnalysis';
import { LocalProcessingUnavailableError, type LocalProcessingInput, type LocalProcessingResult } from './localDocumentProcessor.types';

export { LocalProcessingUnavailableError } from './localDocumentProcessor.types';

const MAX_PDF_PAGES = 30;
const MAX_CANVAS_PIXELS = 4_500_000;
const MIN_EMBEDDED_TEXT_LENGTH = 40;

GlobalWorkerOptions.workerSrc = '/local-ocr/pdfjs/pdf.worker.min.mjs';

function throwIfCancelled(signal?: AbortSignal) {
  if (signal?.aborted) throw new DOMException('Local processing was cancelled.', 'AbortError');
}

async function createLocalOcrWorker(onProgress: (fraction: number) => void): Promise<Worker> {
  return createWorker('eng', OEM.LSTM_ONLY, {
    workerPath: '/local-ocr/tesseract/worker.min.js',
    langPath: '/local-ocr/tessdata',
    corePath: '/local-ocr/tesseract-core',
    workerBlobURL: false,
    gzip: true,
    logger: (message) => onProgress(Math.max(0, Math.min(1, message.progress))),
  });
}

async function recognizeImage(input: LocalProcessingInput): Promise<LocalTextPage[]> {
  if (/image\/(?:heic|heif)/i.test(input.mimeType)) {
    throw new LocalProcessingUnavailableError('HEIC/HEIF cannot be decoded reliably by this browser. Export the photo as JPG or PNG, then import it again.');
  }
  let worker: Worker | undefined;
  try {
    worker = await createLocalOcrWorker((fraction) => input.onProgress?.('reading', fraction));
    throwIfCancelled(input.signal);
    const blob = new Blob([input.bytes], { type: input.mimeType });
    const result = await worker.recognize(blob);
    throwIfCancelled(input.signal);
    input.onProgress?.('reading', 1);
    return [{ pageNumber: 1, text: result.data.text.trim() }];
  } finally {
    await worker?.terminate();
  }
}

function textFromPdfItems(items: { str?: string; hasEOL?: boolean }[]): string {
  return items.map((item) => `${item.str ?? ''}${item.hasEOL ? '\n' : ' '}`).join('').replace(/[ \t]+\n/g, '\n').trim();
}

async function recognizePdf(input: LocalProcessingInput): Promise<LocalTextPage[]> {
  const loadingTask = getDocument({ data: new Uint8Array(input.bytes) });
  const pdf = await loadingTask.promise;
  if (pdf.numPages > MAX_PDF_PAGES) {
    await loadingTask.destroy();
    throw new LocalProcessingUnavailableError(`Local PDF processing is limited to ${MAX_PDF_PAGES} pages to protect phone memory. Split this PDF into smaller files.`);
  }

  const pages: LocalTextPage[] = [];
  let worker: Worker | undefined;
  try {
    for (let index = 0; index < pdf.numPages; index += 1) {
      throwIfCancelled(input.signal);
      const pageNumber = index + 1;
      const page = await pdf.getPage(pageNumber);
      const textContent = await page.getTextContent();
      let text = textFromPdfItems(textContent.items as { str?: string; hasEOL?: boolean }[]);
      const baseViewport = page.getViewport({ scale: 1 });

      if (text.replace(/\s/g, '').length < MIN_EMBEDDED_TEXT_LENGTH) {
        const scale = Math.min(1.8, Math.max(0.8, Math.sqrt(MAX_CANVAS_PIXELS / (baseViewport.width * baseViewport.height))));
        const viewport = page.getViewport({ scale });
        const canvas = document.createElement('canvas');
        canvas.width = Math.ceil(viewport.width);
        canvas.height = Math.ceil(viewport.height);
        const context = canvas.getContext('2d', { alpha: false });
        if (!context) throw new LocalProcessingUnavailableError('This browser could not prepare the PDF page for local OCR.');
        await page.render({ canvas, canvasContext: context, viewport }).promise;
        worker ??= await createLocalOcrWorker((fraction) => input.onProgress?.('reading', (index + fraction) / pdf.numPages));
        const result = await worker.recognize(canvas);
        text = result.data.text.trim();
        canvas.width = 1;
        canvas.height = 1;
      }

      pages.push({ pageNumber, text, width: baseViewport.width, height: baseViewport.height });
      page.cleanup();
      input.onProgress?.('reading', pageNumber / pdf.numPages);
    }
    return pages;
  } finally {
    await worker?.terminate();
    await pdf.cleanup();
    await loadingTask.destroy();
  }
}

export async function processDocumentLocally(input: LocalProcessingInput): Promise<LocalProcessingResult> {
  throwIfCancelled(input.signal);
  let pages: LocalTextPage[];
  if (input.mimeType === 'text/plain') {
    pages = [{ pageNumber: 1, text: new TextDecoder().decode(input.bytes) }];
    input.onProgress?.('reading', 1);
  } else if (input.mimeType === 'application/pdf') {
    pages = await recognizePdf(input);
  } else if (input.mimeType.startsWith('image/')) {
    pages = await recognizeImage(input);
  } else {
    throw new LocalProcessingUnavailableError('Choose a PDF, JPG, PNG, or plain text file for local processing.');
  }

  throwIfCancelled(input.signal);
  input.onProgress?.('analyzing', 0);
  const analysis = analyzeTextLocally(pages, input.fileName);
  input.onProgress?.('analyzing', 1);
  return { pages, analysis };
}
