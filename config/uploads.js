const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const multer = require('multer');

// Env-based config: set UPLOAD_DIR and/or MAX_FILE_SIZE_MB in .env
const UPLOAD_BASE = path.resolve(process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads'));
const MAX_FILE_SIZE_MB = Math.max(1, Math.min(100, parseInt(process.env.MAX_FILE_SIZE_MB, 10) || 10));
const MAX_FILE_SIZE = MAX_FILE_SIZE_MB * 1024 * 1024;

const ALLOWED_MIME = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
];

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

// Ensure base upload directory exists when module loads (fixes "upload failed" when dir missing)
ensureDir(UPLOAD_BASE);

/**
 * Write an uploaded file (from memory buffer) to org/case folder. Call from controller after multer.
 * @param {object} file - req.file from multer (memory: file.buffer, file.originalname, file.mimetype)
 * @param {number} organizationId
 * @param {number} caseId
 * @returns {string} relative path from UPLOAD_BASE (for DB)
 */
function writeUploadToDisk(file, organizationId, caseId) {
  const safeCaseId = String(caseId).replace(/\D/g, '') || '0';
  const dir = path.join(UPLOAD_BASE, `organization_${organizationId}`, `case_${safeCaseId}`);
  ensureDir(dir);
  const ext = path.extname(file.originalname || '') || '';
  const safeExt = ext.replace(/[^a-zA-Z0-9.]/g, '');
  const filename = `${crypto.randomUUID()}${safeExt}`;
  const fullPath = path.join(dir, filename);
  fs.writeFileSync(fullPath, file.buffer);
  return path.relative(UPLOAD_BASE, fullPath);
}

function fileFilter(req, file, cb) {
  const name = (file.originalname || '').replace(/\.\./g, '');
  if (name !== (file.originalname || '')) {
    return cb(new Error('Invalid file name'));
  }
  if (!ALLOWED_MIME.includes(file.mimetype)) {
    return cb(new Error('File type not allowed'));
  }
  cb(null, true);
}

// Use memory storage so we don't need req.body/req.user in multer (avoids "Organization and case context required")
const memoryStorage = multer.memoryStorage();

const uploadDocument = multer({
  storage: memoryStorage,
  fileFilter,
  limits: { fileSize: MAX_FILE_SIZE }
});

const uploadNewVersion = multer({
  storage: memoryStorage,
  fileFilter,
  limits: { fileSize: MAX_FILE_SIZE }
});

module.exports = {
  UPLOAD_BASE,
  MAX_FILE_SIZE,
  MAX_FILE_SIZE_MB,
  ALLOWED_MIME,
  ensureDir,
  writeUploadToDisk,
  uploadDocument,
  uploadNewVersion
};
