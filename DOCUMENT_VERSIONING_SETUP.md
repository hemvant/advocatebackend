# Document Versioning & Audit Trail Setup

## 1. Run migration

```bash
npx sequelize-cli db:migrate
```

Migration `20250222100001-document-versioning-audit.js`:

- Adds to `document_versions`: `organization_id`, `file_name`, `file_size`, `mime_type`, `ocr_text`, `change_type`, `changed_by`, `change_summary`; indexes on `organization_id` and `created_at`.
- Adds to `case_documents`: `current_version` (default 1), backfilled from `version_number`.

## 2. Behavior

- **Create**: On first upload, a version row is created with `change_type: CREATED`.
- **File update**: Upload new version stores the previous file snapshot in `document_versions` with `change_type: UPDATED_FILE`, then updates the document.
- **Metadata update**: A version row is created with `change_type: UPDATED_METADATA` and a `change_summary` (e.g. "File name changed from X to Y").
- **Delete**: Before soft-deleting, a version row is created with `change_type: DELETED`.
- **Restore**: ORG_ADMIN only. Creates a new version by copying the selected version’s file/metadata and updates the document (no file overwrite; reuses existing file path).

## 3. Access

- **ORG_ADMIN**: Full version history for all org documents; can restore any version.
- **EMPLOYEE**: Version history only for documents they can access (uploaded by them or case assigned to them); no restore.

## 4. Routes

- `GET /api/documents/:id/versions` – Paginated version list (same access as document).
- `GET /api/documents/:id/versions/:versionId/download` – Download that version’s file.
- `POST /api/documents/:id/restore/:versionId` – Restore to that version (ORG_ADMIN only).

All behind organization auth and "Document Management" module.

## 5. Audit

Document create/update/delete (and restore) are logged via existing `auditService` (entity_type: DOCUMENT).
