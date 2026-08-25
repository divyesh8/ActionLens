import { cp, mkdir, readdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outputRoot = path.join(projectRoot, 'public', 'local-ocr');

const packageRoot = (name) => path.dirname(import.meta.resolve(`${name}/package.json`).replace('file:///', '').replaceAll('/', path.sep));

const tesseractRoot = packageRoot('tesseract.js');
const coreRoot = packageRoot('tesseract.js-core');
const languageRoot = packageRoot('@tesseract.js-data/eng');
const pdfRoot = packageRoot('pdfjs-dist');

await rm(outputRoot, { recursive: true, force: true });
await Promise.all([
  mkdir(path.join(outputRoot, 'tesseract'), { recursive: true }),
  mkdir(path.join(outputRoot, 'tesseract-core'), { recursive: true }),
  mkdir(path.join(outputRoot, 'tessdata'), { recursive: true }),
  mkdir(path.join(outputRoot, 'pdfjs'), { recursive: true }),
]);

await cp(path.join(tesseractRoot, 'dist', 'worker.min.js'), path.join(outputRoot, 'tesseract', 'worker.min.js'));
await cp(path.join(languageRoot, '4.0.0_best_int', 'eng.traineddata.gz'), path.join(outputRoot, 'tessdata', 'eng.traineddata.gz'));
await cp(path.join(pdfRoot, 'build', 'pdf.worker.min.mjs'), path.join(outputRoot, 'pdfjs', 'pdf.worker.min.mjs'));

const coreFiles = (await readdir(coreRoot)).filter((name) => /^tesseract-core(?:-(?:simd|relaxedsimd))?(?:-lstm)?\.wasm(?:\.js)?$/.test(name));
await Promise.all(coreFiles.map((name) => cp(path.join(coreRoot, name), path.join(outputRoot, 'tesseract-core', name))));

console.log(`Prepared self-hosted OCR runtime (${coreFiles.length + 3} files).`);
