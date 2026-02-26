const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const multer = require('multer');

// Env-based config: set UPLOAD_DIR and/or MAX_FILE_SIZE_MB in .env
// Case-wise folder: storage/{organisation_id}/{case_id}/ (relative: organization_${id}/case_${id})
const UPLOAD_BASE = path.resolve(process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads'));
const STORAGE_ORG_PREFIX = 'organization_';
const STORAGE_CASE_PREFIX = 'case_';
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
 * Generate auto filename: {case_number}_{document_type}_{date}.{ext}
 * @param {string} caseNumber
 * @param {string} documentType - e.g. PETITION, EVIDENCE
 * @param {string} ext - e.g. .pdf
 */
function generateDocumentFileName(caseNumber, documentType, ext) {
  const safe = (s) => String(s || '').replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 80) || 'doc';
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const e = (ext || '').replace(/^\./, '') || 'pdf';
  return `${safe(caseNumber)}_${safe(documentType)}_${date}.${e}`;
}

/**
 * Write an uploaded file to org/case folder. Optional auto-rename: {case_number}_{document_type}_{date}.ext
 * @param {object} file - req.file from multer (memory: file.buffer, file.originalname, file.mimetype)
 * @param {number} organizationId
 * @param {number} caseId
 * @param {{ caseNumber?: string, documentType?: string }} [opts] - if both set, use auto-rename
 * @returns {string} relative path from UPLOAD_BASE (for DB)
 */
function writeUploadToDisk(file, organizationId, caseId, opts = {}) {
  const safeCaseId = String(caseId).replace(/\D/g, '') || '0';
  const dir = path.join(UPLOAD_BASE, `${STORAGE_ORG_PREFIX}${organizationId}`, `${STORAGE_CASE_PREFIX}${safeCaseId}`);
  ensureDir(dir);
  const ext = path.extname(file.originalname || '') || '';
  const safeExt = ext.replace(/[^a-zA-Z0-9.]/g, '');
  let filename;
  if (opts.caseNumber != null && opts.documentType != null) {
    filename = generateDocumentFileName(opts.caseNumber, opts.documentType, safeExt || '.pdf');
  } else {
    filename = `${crypto.randomUUID()}${safeExt}`;
  }
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

const PROFILE_IMAGE_MIME = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const MAX_PROFILE_SIZE = 5 * 1024 * 1024; // 5MB

function profileImageFilter(req, file, cb) {
  const name = (file.originalname || '').replace(/\.\./g, '');
  if (name !== (file.originalname || '')) return cb(new Error('Invalid file name'));
  if (!PROFILE_IMAGE_MIME.includes(file.mimetype)) return cb(new Error('Only images (JPEG, PNG, GIF, WebP) allowed'));
  cb(null, true);
}

const uploadProfileImage = multer({
  storage: memoryStorage,
  fileFilter: profileImageFilter,
  limits: { fileSize: MAX_PROFILE_SIZE }
});

const PDF_MIME = ['application/pdf'];
function pdfOnlyFilter(req, file, cb) {
  if (!PDF_MIME.includes(file.mimetype)) return cb(new Error('Only PDF allowed'));
  cb(null, true);
}
const uploadCauseListPdf = multer({
  storage: memoryStorage,
  fileFilter: pdfOnlyFilter,
  limits: { fileSize: MAX_FILE_SIZE }
});

function writeProfileImageToDisk(file, organizationId, prefix) {
  const dir = path.join(UPLOAD_BASE, `organization_${organizationId}`, 'profile');
  ensureDir(dir);
  const ext = path.extname(file.originalname || '') || '.jpg';
  const safeExt = ext.replace(/[^a-zA-Z0-9.]/g, '');
  const filename = `${prefix}_${crypto.randomUUID()}${safeExt}`;
  const fullPath = path.join(dir, filename);
  fs.writeFileSync(fullPath, file.buffer);
  return path.relative(UPLOAD_BASE, fullPath);
}

module.exports = {
  UPLOAD_BASE,
  STORAGE_ORG_PREFIX,
  STORAGE_CASE_PREFIX,
  MAX_FILE_SIZE,
  MAX_FILE_SIZE_MB,
  ALLOWED_MIME,
  ensureDir,
  generateDocumentFileName,
  writeUploadToDisk,
  writeProfileImageToDisk,
  uploadDocument,
  uploadNewVersion,
  uploadProfileImage,
  uploadCauseListPdf
};
