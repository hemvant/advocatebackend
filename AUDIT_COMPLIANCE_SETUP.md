# Enterprise Audit Compliance System – Setup

## Migration

```bash
npx sequelize-cli db:migrate
```

Migration `20250224100001-audit-logs-enterprise.js` adds to `audit_logs`:

- `user_name`, `user_role` – snapshot at time of action
- `module_name` – e.g. DOCUMENTS, HEARINGS, CASES, AUTH
- `action_summary` – human-readable description (TEXT)
- `user_agent` – device/browser (VARCHAR 500)
- `log_hash` – SHA256 chain for tamper resistance
- Indexes on `entity_id`, `module_name`

## Behaviour

- **auditLogger.logAudit()** – Central logger. Captures IP, user-agent, user name/role snapshot, builds `action_summary` from **auditDiff.generateChangeSummary()** for UPDATEs, or uses **buildActionSummary()** for CREATE/DELETE/LOGIN etc. Writes to `audit_logs` and optionally chains `log_hash`.
- **auditService.log()** – Delegates to auditLogger; existing callers get the new format. Pass `module_name`, `entity_label`, `action_summary` when you have them.
- **auditDiff.generateChangeSummary(oldData, newData)** – Returns `{ summary, oldValues, newValues }` for human-readable diffs. Sensitive keys (password, token, etc.) are skipped.

## Access

- **ORG_ADMIN** – Full audit logs for their organization.
- **EMPLOYEE** – Only logs where `user_id = current user`.
- **Super Admin** – Uses separate platform audit route; not this API.

All org audit queries filter by `organization_id`.

## API

- `GET /api/audit-logs` – List (paginated). Query: `from_date`, `to_date`, `module_name`, `entity_type`, `action_type`, `user_id`, `page`, `limit`, `sort`, `order`.
- `GET /api/audit-logs/export` – CSV export with same filters (max 10,000 rows). No update/delete endpoints; logs are append-only.

## Tamper resistance

- No update or delete endpoints for audit logs; only insert via auditLogger.
- Optional `log_hash`: each row stores SHA256(previous_hash + current payload) for chaining.

## Frontend

- `/audit-logs` – Table: Action summary, User, Module, Date, Details (expand for old/new values, IP, user agent). Filters: module, entity type, action type, date range. “Export CSV” uses current filters.

## Security

- Routes use `organizationAuth` and `moduleAccessMiddleware('Reports')`.
- Organization isolation enforced in controller `where` clause.
- Failed auth attempts can be logged separately (e.g. AUTH module, action_type FAILED_LOGIN) if needed.
