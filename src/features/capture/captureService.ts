import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';

export const MAX_UPLOAD_BYTES = 6 * 1024 * 1024;
export const MAX_PASTED_TEXT_LENGTH = 100_000;

const supportedMimeTypes = new Set(['application/pdf', 'image/jpeg', 'image/png', 'image/heic', 'image/heif', 'text/plain']);

export type ImportSource = {
  uri: string;
  name: string;
  mimeType: string;
  size: number;
  origin: 'camera' | 'photo' | 'file';
  webFile?: Blob;
};

export class CaptureValidationError extends Error {}

function mimeFromName(name: string): string | null {
  const extension = name.toLowerCase().split('.').pop();
  if (extension === 'pdf') return 'application/pdf';
  if (extension === 'jpg' || extension === 'jpeg') return 'image/jpeg';
  if (extension === 'png') return 'image/png';
  if (extension === 'heic') return 'image/heic';
  if (extension === 'heif') return 'image/heif';
  if (extension === 'txt') return 'text/plain';
  return null;
}

function validateSource(source: ImportSource): ImportSource {
  if (!supportedMimeTypes.has(source.mimeType)) throw new CaptureValidationError('ActionLens supports PDF, JPG, PNG, HEIC, HEIF, and plain text files.');
  if (source.size <= 0) throw new CaptureValidationError('This file appears to be empty. Choose another file.');
  if (source.size > MAX_UPLOAD_BYTES) throw new CaptureValidationError('This file is larger than 6 MB. Choose a smaller copy for reliable processing.');
  return source;
}

function imageSource(asset: ImagePicker.ImagePickerAsset, origin: 'camera' | 'photo'): ImportSource {
  const name = asset.fileName ?? `${origin}-${Date.now()}.jpg`;
  const size = asset.fileSize ?? asset.file?.size ?? new File(asset.uri).size;
  return validateSource({
    uri: asset.uri,
    name,
    mimeType: asset.mimeType ?? mimeFromName(name) ?? 'image/jpeg',
    size,
    origin,
    ...(asset.file ? { webFile: asset.file } : {}),
  });
}

export async function takeDocumentPhoto(): Promise<ImportSource | null> {
  const permission = await ImagePicker.requestCameraPermissionsAsync();
  if (!permission.granted) throw new CaptureValidationError('Camera access is required to photograph a document. You can also choose a photo or file.');
  const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.82, allowsEditing: false, exif: false });
  if (result.canceled || !result.assets[0]) return null;
  return imageSource(result.assets[0], 'camera');
}

export async function pickDocumentPhoto(): Promise<ImportSource | null> {
  const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.82, allowsEditing: false, exif: false });
  if (result.canceled || !result.assets[0]) return null;
  return imageSource(result.assets[0], 'photo');
}

export async function pickDocumentFile(): Promise<ImportSource | null> {
  const result = await DocumentPicker.getDocumentAsync({ type: Array.from(supportedMimeTypes), copyToCacheDirectory: true, multiple: false, base64: false });
  if (result.canceled || !result.assets[0]) return null;
  const asset = result.assets[0];
  const mimeType = asset.mimeType ?? mimeFromName(asset.name);
  if (!mimeType) throw new CaptureValidationError('ActionLens could not identify this file type. Choose a PDF, image, or text file.');
  const size = asset.size ?? asset.file?.size ?? new File(asset.uri).size;
  return validateSource({
    uri: asset.uri,
    name: asset.name,
    mimeType,
    size,
    origin: 'file',
    ...(asset.file ? { webFile: asset.file } : {}),
  });
}

export function validatePastedText(value: string): string {
  const text = value.trim();
  if (text.length < 10) throw new CaptureValidationError('Paste at least a full sentence so ActionLens has enough source information.');
  if (text.length > MAX_PASTED_TEXT_LENGTH) throw new CaptureValidationError('Pasted text is limited to 100,000 characters. Add it as a file instead.');
  return text;
}
