const { CaseDocument } = require('../models');
const { UPLOAD_BASE } = require('../config/uploads');
const ocrService = require('../services/ocrService');
const logger = require('./logger');

let processing = false;
const queue = [];

function enqueue(documentId) {
  if (queue.includes(documentId)) return;
  queue.push(documentId);
  processNext();
}

function processNext() {
  if (processing || queue.length === 0) return;
  processing = true;
  const id = queue.shift();
  runOcrForDocument(id)
    .catch((err) => logger.warn('[OCR] runOcrForDocument error:', err && err.message))
    .finally(() => {
      processing = false;
      if (queue.length > 0) setImmediate(processNext);
    });
}

async function runOcrForDocument(documentId) {
  const doc = await CaseDocument.findOne({
    where: { id: documentId, is_deleted: false }
  });
  if (!doc) return;
  const supported = [...ocrService.IMAGE_MIMES, ocrService.PDF_MIME, 'text/plain'].includes((doc.mime_type || '').toLowerCase().split(';')[0].trim());
  if (!supported) {
    await doc.update({ ocr_status: 'COMPLETED', ocr_text: null });
    return;
  }
  await doc.update({ ocr_status: 'PROCESSING' });
  const path = require('path');
  const fs = require('fs');
  const normalizedRelative = (doc.file_path || '').replace(/\\/g, '/');
  const filePath = normalizedRelative ? path.join(UPLOAD_BASE, normalizedRelative) : null;
  if (!filePath || !fs.existsSync(filePath)) {
    logger.warn('[OCR] File not found: ' + (filePath || 'no path'));
    await doc.update({ ocr_status: 'FAILED', ocr_text: null });
    return;
  }
  const relativePath = normalizedRelative;
  const start = Date.now();
  const result = await ocrService.extractText(relativePath, doc.mime_type);
  const elapsed = Date.now() - start;
  logger.info(`[OCR] document_id=${doc.id} processingTimeMs=${result.processingTimeMs} elapsed=${elapsed}`);
  await doc.update({
    ocr_status: result.error && !result.text ? 'FAILED' : 'COMPLETED',
    ocr_text: result.text || null
  });
}

function triggerOcr(documentId) {
  setImmediate(() => enqueue(documentId));
}

module.exports = { enqueue, triggerOcr, processNext };
