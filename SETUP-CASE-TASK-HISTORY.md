# Case assignment, task management & history setup

## Migrations

Run pending migrations from the backend directory:

```bash
cd backend
npx sequelize-cli db:migrate
```

Migration `20250228100001-case-assignment-task-history.js` will:

- Add `assigned_at`, `assigned_by` to `cases` (if not present)
- Create `case_assignment_changes` (reassignment events)
- Add `assigned_by` to `case_tasks` (if not present)
- Create `task_assignment_history`
- Create `case_activity_logs` (activity_type ENUM, activity_summary TEXT)

## API

- **GET** `/cases/:id/history` — Assignment history + activity timeline (query: `user_id`, `activity_type`, `from_date`, `to_date`)
- **GET** `/tasks/:id/history` — Task assignment history + activity (same query params)

## Access

- **ORG_ADMIN**: Full case and task history.
- **EMPLOYEE**: Only own assigned cases/tasks and own activity logs; history filtered by `user_id`.

All endpoints enforce `organization_id` and role-based access.
