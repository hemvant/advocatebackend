const path = require('path');
const fs = require('fs');

const { UPLOAD_BASE } = require('../config/uploads');
const IMAGE_MIMES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const PDF_MIME = 'application/pdf';
const MAX_OCR_LENGTH = 500000;
const SANITIZE_REGEX = /[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g;

function sanitizeOcrText(text) {
  if (typeof text !== 'string') return null;
  const t = text.replace(SANITIZE_REGEX, '').replace(/\s+/g, ' ').trim().slice(0, MAX_OCR_LENGTH);
  return t || null;
}

function safePath(fullPath) {
  const resolved = path.resolve(fullPath);
  const base = path.resolve(UPLOAD_BASE);
  if (!resolved.startsWith(base)) return null;
  if (resolved.includes('..')) return null;
  return resolved;
}

/**
 * Extract text from file. Non-blocking; run from queue.
 * @param {string} filePath - Relative path from UPLOAD_BASE or absolute
 * @param {string} mimeType
 * @returns {{ text: string|null, processingTimeMs: number, error?: string }}
 */
async function extractText(filePath, mimeType) {
  const start = Date.now();
  const normalizedMime = (mimeType || '').toLowerCase().split(';')[0].trim();

  const normalizedInput = (filePath || '').replace(/\\/g, '/');
  const absolutePath = path.isAbsolute(normalizedInput) ? normalizedInput : path.join(UPLOAD_BASE, normalizedInput);
  const safe = safePath(absolutePath);
  if (!safe || !fs.existsSync(safe)) {
    return { text: null, processingTimeMs: Date.now() - start, error: 'File not found or path invalid' };
  }

  try {
    if (IMAGE_MIMES.includes(normalizedMime)) {
      let Tesseract;
      try {
        Tesseract = require('tesseract.js');
      } catch (e) {
        return { text: null, processingTimeMs: Date.now() - start, error: 'OCR not available: install tesseract.js (npm install tesseract.js)' };
      }
      const { data } = await Tesseract.recognize(safe, 'eng', { logger: () => {} });
      const text = sanitizeOcrText(data?.text);
      return { text, processingTimeMs: Date.now() - start };
    }

    if (normalizedMime === PDF_MIME) {
      let pdfParse;
      try {
        pdfParse = require('pdf-parse');
      } catch (e) {
        return { text: null, processingTimeMs: Date.now() - start, error: 'OCR not available: install pdf-parse (npm install pdf-parse)' };
      }
      const buffer = fs.readFileSync(safe);
      const data = await pdfParse(buffer);
      const text = data?.text ? sanitizeOcrText(data.text) : null;
      return { text, processingTimeMs: Date.now() - start };
    }

    if (normalizedMime === 'text/plain') {
      const buf = fs.readFileSync(safe, 'utf8');
      const text = sanitizeOcrText(buf);
      return { text, processingTimeMs: Date.now() - start };
    }

    return { text: null, processingTimeMs: Date.now() - start, error: 'Unsupported type for OCR' };
  } catch (err) {
    return {
      text: null,
      processingTimeMs: Date.now() - start,
      error: err && err.message ? err.message : 'OCR failed'
    };
  }
}

module.exports = { extractText, sanitizeOcrText, IMAGE_MIMES, PDF_MIME, UPLOAD_BASE, safePath };
