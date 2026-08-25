import type { DocumentAnalysis } from './analysisSchema';
import type { LocalTextPage } from './localAnalysis';

export type LocalProcessingStage = 'reading' | 'analyzing';

export type LocalProcessingInput = {
  bytes: ArrayBuffer;
  fileName: string;
  mimeType: string;
  signal?: AbortSignal;
  onProgress?: (stage: LocalProcessingStage, fraction: number) => void;
};

export type LocalProcessingResult = {
  pages: LocalTextPage[];
  analysis: DocumentAnalysis;
};

export class LocalProcessingUnavailableError extends Error {}
