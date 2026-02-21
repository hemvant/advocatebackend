# Document OCR Setup

## 1. Run migration

```bash
npx sequelize-cli db:migrate
```

Migration `20250221100001-add-ocr-to-case-documents.js` adds `ocr_status` and `ocr_text` to `case_documents`, plus indexes and FULLTEXT on `ocr_text`.

## 2. Install OCR dependencies

```bash
npm install tesseract.js pdf-parse
```

## 3. Behavior

- **Upload**: New documents get `ocr_status: 'PENDING'`. OCR is triggered in the background (in-memory queue); the upload response returns immediately.
- **Queue**: `utils/ocrQueue.js` processes one document at a time. No Redis/Bull; uses `setImmediate` and a simple queue.
- **Search**: `GET /api/documents/search?q=keyword` uses MySQL FULLTEXT on `ocr_text` (same org/role rules as list).
- **Dashboard**: `GET /api/documents/dashboard` returns total, processed, pending, and recent documents for the current org.

## 4. Supported types for OCR

- Images: JPEG, PNG, GIF, WebP (Tesseract)
- PDF: text extraction via pdf-parse (no image fallback)
- Plain text: read and sanitized

Unsupported types are marked `COMPLETED` with `ocr_text: null`.
