import type { DocumentAnalysis, OCRResult } from './analysisSchema.ts';
import { analyzeDocument, extractOCR } from './openai.ts';

export type ProviderResult<T> = {
  result: T;
  requestId: string | null;
  usage: { input: number | null; output: number | null };
};

export interface OCRProvider {
  extract(options: { filename: string; mimeType: string; dataUrl: string }): Promise<ProviderResult<OCRResult>>;
}

export interface DocumentAnalysisProvider {
  analyze(options: { pages: OCRResult['pages']; timezone: string }): Promise<ProviderResult<DocumentAnalysis>>;
}

export function createOpenAIProviders(options: { apiKey: string; ocrModel: string; analysisModel: string }): { ocr: OCRProvider; analysis: DocumentAnalysisProvider } {
  return {
    ocr: {
      extract: (input) => extractOCR({ apiKey: options.apiKey, model: options.ocrModel, ...input }),
    },
    analysis: {
      analyze: (input) => analyzeDocument({ apiKey: options.apiKey, model: options.analysisModel, ...input }),
    },
  };
}
