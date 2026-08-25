import { documentAnalysisSchema, type Confidence, type DocumentAnalysis } from './analysisSchema.ts';

export type LocalTextPage = {
  pageNumber: number;
  text: string;
  width?: number | null;
  height?: number | null;
};

type EvidenceLine = { text: string; pageNumber: number };

const months: Record<string, number> = {
  january: 1, jan: 1, february: 2, feb: 2, march: 3, mar: 3, april: 4, apr: 4,
  may: 5, june: 6, jun: 6, july: 7, jul: 7, august: 8, aug: 8, september: 9,
  sep: 9, sept: 9, october: 10, oct: 10, november: 11, nov: 11, december: 12, dec: 12,
};

const deadlineWords = /\b(deadline|due|last date|by|before|no later than|submit(?:ted)? on or before|expires?|closing date)\b/i;
const actionWords = /\b(apply|submit|send|upload|complete|fill|sign|pay|contact|call|email|visit|attend|register|renew|bring|collect|download|respond|reply|provide)\b/i;
const requirementWords = /\b(required|requirement|must|shall|need(?:ed)? to|have to|mandatory|attach|provide|submit|bring|eligible|eligibility)\b/i;
const warningWords = /\b(warning|important|penalty|late fee|rejected|cancelled|canceled|failure to|will result|do not|not accepted)\b/i;
const eligibilityWords = /\b(eligible|eligibility|must be|minimum age|maximum age|resident|citizen|income|qualification)\b/i;
const addressWords = /\b(address|venue|location|office|campus|building|street|road|lane|avenue|district|city|state|pin(?:code)?|zip)\b/i;
const organizationWords = /\b(university|college|school|department|authority|government|ministry|council|board|bank|company|institute|office|association|foundation|hospital)\b/i;

function compact(value: string, limit: number): string {
  return value.replace(/\s+/g, ' ').trim().slice(0, limit);
}

function sourceLines(pages: LocalTextPage[]): EvidenceLine[] {
  return pages.flatMap((page) => page.text.split(/\r?\n|(?<=[.!?])\s+(?=[A-Z])/)
    .map((text) => ({ text: compact(text, 4000), pageNumber: page.pageNumber }))
    .filter((line) => line.text.length >= 4));
}

function uniqueBySource<T extends { sourceText: string }>(values: T[], limit: number): T[] {
  const seen = new Set<string>();
  return values.filter((value) => {
    const key = value.sourceText.toLocaleLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, limit);
}

function isoDate(year: number, month: number, day: number): string | null {
  if (year < 2000 || year > 2100 || month < 1 || month > 12 || day < 1 || day > 31) return null;
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function normalizeDate(value: string): string | null {
  const normalized = value.replace(/[,]/g, ' ').replace(/\s+/g, ' ').trim();
  let match = normalized.match(/^(20\d{2})[-/.](\d{1,2})[-/.](\d{1,2})$/);
  if (match) return isoDate(Number(match[1]), Number(match[2]), Number(match[3]));
  match = normalized.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})$/);
  if (match) {
    const year = Number(match[3]) < 100 ? 2000 + Number(match[3]) : Number(match[3]);
    return isoDate(year, Number(match[2]), Number(match[1]));
  }
  match = normalized.match(/^(\d{1,2})(?:st|nd|rd|th)?\s+([a-z]+)\s+(20\d{2})$/i);
  if (match) return isoDate(Number(match[3]), months[match[2]!.toLowerCase()] ?? 0, Number(match[1]));
  match = normalized.match(/^([a-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?\s+(20\d{2})$/i);
  if (match) return isoDate(Number(match[3]), months[match[1]!.toLowerCase()] ?? 0, Number(match[2]));
  return null;
}

function datesIn(text: string): { dateText: string; date: string | null }[] {
  const patterns = [
    /\b20\d{2}[-/.]\d{1,2}[-/.]\d{1,2}\b/g,
    /\b\d{1,2}[-/.]\d{1,2}[-/.](?:20)?\d{2}\b/g,
    /\b\d{1,2}(?:st|nd|rd|th)?\s+(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+20\d{2}\b/gi,
    /\b(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{1,2}(?:st|nd|rd|th)?(?:,)?\s+20\d{2}\b/gi,
  ];
  const matches = patterns.flatMap((pattern) => Array.from(text.matchAll(pattern), (match) => match[0]));
  return [...new Set(matches)].map((dateText) => ({ dateText, date: normalizeDate(dateText) }));
}

function titleFor(line: string, prefix: string): string {
  const clean = compact(line.replace(/^[-*•\d.)\s]+/, ''), 210);
  return compact(`${prefix}${clean}`, 240);
}

function confidenceFor(line: string): Confidence {
  return line.length > 12 ? 'review_recommended' : 'uncertain';
}

function inferDocumentType(text: string): string | null {
  const types: [RegExp, string][] = [
    [/\b(invoice|payment notice|amount due)\b/i, 'Payment notice'],
    [/\b(admission|application form|apply online)\b/i, 'Application notice'],
    [/\b(exam|examination|hall ticket)\b/i, 'Examination notice'],
    [/\b(appointment|meeting|interview)\b/i, 'Appointment notice'],
    [/\b(scholarship|grant)\b/i, 'Funding notice'],
    [/\b(renewal|expires?|expiry)\b/i, 'Renewal notice'],
    [/\b(notice|notification|announcement)\b/i, 'Notice'],
  ];
  return types.find(([pattern]) => pattern.test(text))?.[1] ?? null;
}

function inferCurrency(value: string): string | null {
  if (/₹|\b(?:INR|Rs\.?)\b/i.test(value)) return 'INR';
  if (/\$|\bUSD\b/i.test(value)) return 'USD';
  if (/€|\bEUR\b/i.test(value)) return 'EUR';
  if (/£|\bGBP\b/i.test(value)) return 'GBP';
  return null;
}

function priorityFor(line: string): 'low' | 'normal' | 'high' | 'urgent' {
  if (/\b(immediately|urgent|today|within 24 hours)\b/i.test(line)) return 'urgent';
  if (/\b(deadline|due|must|penalty|before)\b/i.test(line)) return 'high';
  return 'normal';
}

export function analyzeTextLocally(pages: LocalTextPage[], fileName: string): DocumentAnalysis {
  const lines = sourceLines(pages);
  const allText = lines.map((line) => line.text).join('\n');
  const firstLine = lines[0]?.text;
  const fileTitle = compact(fileName.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' '), 240) || 'Untitled document';
  const documentTitle = firstLine && firstLine.length <= 120 && !/[.!?].+[.!?]/.test(firstLine) ? firstLine : fileTitle;
  const summary = compact(lines.slice(0, 4).map((line) => line.text).join(' '), 2000) || 'No readable text was found. Review the original document manually.';
  const evidence = (line: EvidenceLine) => ({ confidence: confidenceFor(line.text), sourceText: line.text, pageNumber: line.pageNumber });

  const deadlines = uniqueBySource(lines.flatMap((line) => deadlineWords.test(line.text)
    ? datesIn(line.text).map((date) => ({ label: titleFor(line.text, 'Deadline: '), ...date, conflictGroup: null, ...evidence(line) }))
    : []), 30);

  const actions = uniqueBySource(lines.filter((line) => actionWords.test(line.text)).map((line) => {
    const date = datesIn(line.text)[0]?.date ?? null;
    return { title: titleFor(line.text, ''), description: null, priority: priorityFor(line.text), suggestedDueDate: date, dependsOnActionIndexes: [], ...evidence(line) };
  }), 50);

  const requirements = uniqueBySource(lines.filter((line) => requirementWords.test(line.text)).map((line) => ({
    title: titleFor(line.text, ''), description: null, required: /\b(required|must|shall|mandatory|have to)\b/i.test(line.text), dependsOnRequirementIndexes: [], ...evidence(line),
  })), 50);

  const amountPattern = /(?:₹|\bINR\b|\bRs\.?|\$|\bUSD\b|€|\bEUR\b|£|\bGBP\b)\s?\d[\d,.]*(?:\.\d{1,2})?/i;
  const payments = uniqueBySource(lines.flatMap((line) => {
    const amount = line.text.match(amountPattern)?.[0];
    if (!amount) return [];
    return [{ label: titleFor(line.text, 'Payment: '), amountText: amount, currency: inferCurrency(amount), dueDate: datesIn(line.text)[0]?.date ?? null, ...evidence(line) }];
  }), 20);

  const contacts = uniqueBySource(lines.flatMap((line) => {
    const email = line.text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] ?? null;
    const phone = line.text.match(/(?:\+?\d[\d\s()-]{7,}\d)/)?.[0]?.trim() ?? null;
    if (!email && !phone) return [];
    return [{ name: null, role: null, email, phone, ...evidence(line) }];
  }), 30);

  const locations = uniqueBySource(lines.filter((line) => addressWords.test(line.text) && /\d|\b(?:office|venue|campus)\b/i.test(line.text)).map((line) => ({
    label: 'Location', addressText: compact(line.text, 1000), ...evidence(line),
  })), 30);

  const eligibility = uniqueBySource(lines.filter((line) => eligibilityWords.test(line.text)).map((line) => ({
    label: titleFor(line.text, ''), description: compact(line.text, 1000), status: 'unknown' as const, ...evidence(line),
  })), 50);

  const links = uniqueBySource(lines.flatMap((line) => Array.from(line.text.matchAll(/https?:\/\/[^\s<>()]+/gi), (match) => ({
    label: 'Source link', url: match[0].replace(/[.,;:]$/, ''), ...evidence(line),
  }))), 30);

  const warnings = uniqueBySource(lines.filter((line) => warningWords.test(line.text)).map((line) => ({
    title: titleFor(line.text, 'Important: '), description: compact(line.text, 1000), ...evidence(line),
  })), 30);

  const organization = lines.slice(0, 8).find((line) => organizationWords.test(line.text) && line.text.length <= 240)?.text ?? null;
  const findingCount = deadlines.length + actions.length + requirements.length + payments.length + contacts.length + eligibility.length;

  return documentAnalysisSchema.parse({
    documentTitle: compact(documentTitle, 240),
    documentType: inferDocumentType(allText),
    organization,
    summary,
    language: 'en',
    deadlines,
    actions,
    requirements,
    payments,
    contacts,
    locations,
    eligibility,
    links,
    warnings,
    confidence: findingCount > 0 ? 'review_recommended' : 'uncertain',
  });
}
