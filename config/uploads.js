const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const multer = require('multer');

const UPLOAD_BASE = path.join(process.cwd(), 'uploads');
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
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

function documentStorage() {
  return multer.diskStorage({
    destination(req, file, cb) {
      const orgId = req.user?.organization_id;
      const caseId = req.body?.case_id;
      if (!orgId || !caseId) {
        return cb(new Error('Organization and case context required'));
      }
      const safeCaseId = String(caseId).replace(/\D/g, '') || '0';
      const dir = path.join(UPLOAD_BASE, `organization_${orgId}`, `case_${safeCaseId}`);
      ensureDir(dir);
      cb(null, dir);
    },
    filename(req, file, cb) {
      const ext = path.extname(file.originalname || '') || '';
      const safeExt = ext.replace(/[^a-zA-Z0-9.]/g, '');
      const name = `${crypto.randomUUID()}${safeExt}`;
      cb(null, name);
    }
  });
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

const uploadDocument = multer({
  storage: documentStorage(),
  fileFilter,
  limits: { fileSize: MAX_FILE_SIZE }
});

const uploadNewVersion = multer({
  storage: documentStorage(),
  fileFilter,
  limits: { fileSize: MAX_FILE_SIZE }
});

module.exports = {
  UPLOAD_BASE,
  MAX_FILE_SIZE,
  ALLOWED_MIME,
  ensureDir,
  uploadDocument,
  uploadNewVersion
};
