import { File, Paths } from 'expo-file-system';
import { recognizeText } from 'expo-ocr-kit';

import { analyzeTextLocally } from './localAnalysis';
import { LocalProcessingUnavailableError, type LocalProcessingInput, type LocalProcessingResult } from './localDocumentProcessor.types';

export { LocalProcessingUnavailableError } from './localDocumentProcessor.types';

function throwIfCancelled(signal?: AbortSignal) {
  if (signal?.aborted) throw new DOMException('Local processing was cancelled.', 'AbortError');
}

function extensionForMimeType(mimeType: string): string {
  if (mimeType === 'image/png') return '.png';
  if (mimeType === 'image/heic') return '.heic';
  if (mimeType === 'image/heif') return '.heif';
  return '.jpg';
}

async function recognizeImage(input: LocalProcessingInput) {
  let temporaryFile: File | undefined;
  try {
    let uri = input.sourceUri;
    if (!uri) {
      temporaryFile = new File(Paths.cache, `actionlens-ocr-${Date.now()}-${Math.random().toString(36).slice(2)}${extensionForMimeType(input.mimeType)}`);
      temporaryFile.create({ overwrite: true, intermediates: true });
      temporaryFile.write(new Uint8Array(input.bytes));
      uri = temporaryFile.uri;
    }
    input.onProgress?.('reading', 0.1);
    throwIfCancelled(input.signal);
    const result = await recognizeText(uri);
    throwIfCancelled(input.signal);
    const text = result.text.trim();
    if (text.replace(/\s/g, '').length < 4) {
      throw new LocalProcessingUnavailableError('No readable text was found in this image. Retake it in good light, keep the page flat, and move closer.');
    }
    input.onProgress?.('reading', 1);
    return [{ pageNumber: 1, text }];
  } catch (error) {
    if (error instanceof LocalProcessingUnavailableError || (error instanceof Error && error.name === 'AbortError')) throw error;
    throw new LocalProcessingUnavailableError('This phone could not read the image. Try a clearer JPG or PNG, or retake the photo in good light.');
  } finally {
    if (temporaryFile?.exists) temporaryFile.delete();
  }
}

export async function processDocumentLocally(input: LocalProcessingInput): Promise<LocalProcessingResult> {
  throwIfCancelled(input.signal);
  let pages;
  if (input.mimeType === 'text/plain') {
    pages = [{ pageNumber: 1, text: new TextDecoder().decode(input.bytes) }];
    input.onProgress?.('reading', 1);
  } else if (input.mimeType.startsWith('image/')) {
    pages = await recognizeImage(input);
  } else {
    throw new LocalProcessingUnavailableError('On-device Android processing supports JPG, PNG, HEIC, HEIF, and plain text. PDF processing is temporarily unavailable.');
  }
  throwIfCancelled(input.signal);
  input.onProgress?.('analyzing', 0);
  const analysis = analyzeTextLocally(pages, input.fileName);
  input.onProgress?.('analyzing', 1);
  return { pages, analysis };
}
