# Packages and Billing Setup

## Migration

```bash
npx sequelize-cli db:migrate
```

Migration `20250223100001-packages-and-billing.js` creates:

- **packages** – name, description, price_monthly, price_annual, annual_discount_percent, employee_limit, is_active
- **package_modules** – package_id, module_id (which modules are in each package)
- **subscriptions** – adds package_id, billing_cycle (MONTHLY | ANNUAL)
- **invoices** – adds subscription_id, package_id, billing_cycle, period_start, period_end, due_date

## Flow

1. **Super Admin** creates **Packages** (e.g. "Starter – ₹499/month, 5 employees") with:
   - Monthly and annual price
   - Optional annual discount %
   - Employee limit
   - Module IDs (which modules the package includes)

2. **Super Admin** assigns a package to an organization:
   - From **Organization detail** → "Assign package" (package + billing cycle)
   - Or when creating an organization (optional package_id + billing_cycle in body)
   - This creates/updates the **subscription** and **syncs organization modules** from the package (replaces org’s module list with the package’s modules).

3. **Validation**
   - When an **org admin adds an employee**, the app checks the org’s active subscription package **employee_limit**. If current employee count ≥ limit, the request is rejected with a message to upgrade.

4. **Billing**
   - **Super Admin**: Create invoices (org, amount, period, due date), mark as paid. List all invoices.
   - **Organization** (Billing module): View current subscription (plan, cycle, expiry, employee limit) and list their invoices.

## Routes

- **Super Admin**
  - `GET/POST /super-admin/packages`, `GET/PUT/DELETE /super-admin/packages/:id` – packages CRUD
  - `POST /super-admin/organizations/:organizationId/subscription` – assign package (body: package_id, billing_cycle)
  - `GET /super-admin/invoices`, `POST /super-admin/invoices`, `PUT /super-admin/invoices/:id/mark-paid`
- **Organization** (requires Billing module)
  - `GET /billing/subscription` – my subscription
  - `GET /billing/invoices` – my invoices

## Notes

- Assigning a package overwrites the organization’s assigned modules with the package’s modules.
- Organizations without an active subscription (or without a package_id on subscription) are not limited by employee_limit; the check only runs when the subscription has a package with an employee_limit.
