# Super Admin Panel – Setup

## Database migrations

Run all migrations so that the Super Admin panel has the required tables:

```bash
cd backend
npm run db:migrate
```

New tables (if not already present):

- `platform_settings` – key/value for platform config
- `system_metrics` – metric_name, metric_value, created_at (e.g. failed logins, errors)
- `super_admin_login_attempts` – email, ip_address, success, created_at
- `impersonation_logs` – super_admin_id, organization_id, organization_user_id, ip_address, started_at, ended_at
- `subscriptions` – organization_id, plan, status, started_at, expires_at
- `invoices` – organization_id, amount, currency, status, paid_at

Optional migration:

- `20250220100006-add-super-admin-lock-fields.js` – adds `failed_login_count`, `locked_until`, `last_login_ip` to `super_admins`

## Environment

No extra env vars are required. Optional:

- Use the same `JWT_SECRET` and cookie settings as the main app (super admin and org auth share the same cookie name; impersonation overwrites the cookie with an org user token for 1 hour).

## Backend API (under `/api/super-admin`)

- **Dashboard:** `GET /dashboard/summary` (12 cards), `GET /dashboard/analytics` (charts)
- **Revenue:** `GET /revenue-summary`
- **System:** `GET /system-health`
- **Organizations:** `GET /organizations?status=&subscription_plan=&from_date=&to_date=&search=&page=&limit=`
- **Organization detail:** `GET /organizations/:id/detail`
- **Impersonate:** `POST /organizations/:organizationId/impersonate` (sets org user cookie, open app in new tab)
- **Subscriptions:** `GET /subscriptions`
- **Audit:** `GET /audit-logs?organization_id=&action_type=&entity_type=&from_date=&to_date=&page=&limit=`

All require super admin auth (cookie from `POST /super-admin/login`).

## Security

- **Login:** IP stored in `super_admin_login_attempts` and in `super_admins.last_login_ip` on success.
- **Throttling:** `express-rate-limit` on login (e.g. 10 requests per 15 minutes).
- **Lock:** After 5 failed attempts, account is locked for 15 minutes (`locked_until`).
- **Impersonation:** Each impersonation is logged in `impersonation_logs` with super_admin_id, organization_id, ip_address, started_at.

## Frontend

1. Install dependencies (including Recharts):

```bash
cd frontend
npm install
```

2. Ensure `VITE_API_URL` points to the backend (e.g. `http://localhost:5000/api`).

3. Super Admin routes (under `/super-admin`):

- `/super-admin/dashboard` – KPI cards and charts
- `/super-admin/organizations` – list, filters, pagination, create/edit/modules, impersonate
- `/super-admin/organizations/:id` – organization detail (stats, recent audit)
- `/super-admin/subscriptions` – active, expiring soon, plan distribution
- `/super-admin/audit-logs` – platform audit with filters
- `/super-admin/system-health` – status, DB, uptime, failed logins, errors

Theme: primary `#0B1F3A`, accent `#C6A14A`, background `#F8F9FA`.

## Revenue and subscriptions data

Revenue is computed from `invoices` where `status = 'PAID'`. Subscriptions are read from the `subscriptions` table. If these tables are empty, dashboard revenue and subscription counts will be zero until you add data (e.g. via seeders or a future billing flow).
