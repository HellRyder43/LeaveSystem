# CLAUDE.md — Leave Management System

This file provides Claude Code with the full project context, conventions, and rules for the **Leave Management System (LMS)** — a commercial-grade leave management platform built for modern organizations.

---

## Project Overview

A full-stack web application enabling:

- **Employees** to manage personal time off
- **Managers** to oversee department staffing and approve requests
- **Admins** to configure global leave policies, holidays, and generate reports

---

## Tech Stack

| Layer              | Technology               |
| ------------------ | ------------------------ |
| Framework          | Next.js (App Router)     |
| Styling            | Tailwind CSS + shadcn/ui |
| Database & Backend | Supabase (PostgreSQL)    |
| Authentication     | Supabase Auth            |
| Deployment         | Vercel                   |

---

## System Timezone

**All date and time logic must use `Asia/Kuala_Lumpur` (UTC+8) as the system timezone.** This applies to:

- Backdated leave window calculations
- SLA day counting
- Cron job scheduling
- Any `new Date()` or timestamp comparison in server actions

Never compare dates in UTC when the business rule is timezone-sensitive. Use a consistent timezone utility (e.g., `date-fns-tz` with `Asia/Kuala_Lumpur`) throughout all server-side logic. Store all timestamps in UTC in the database but convert to `Asia/Kuala_Lumpur` for all business rule evaluations.

---

## User Roles & Permissions

### Employee (Base Role)

- View personal leave balances and history
- Apply for leave (Full Day, Half Day AM/PM)
- Cancel pending leave requests
- Cancel approved future leave (within cancellation window)
- Upload supporting documents (e.g., Medical Certificates)
- View department/team shared calendar (names and dates only — no reason or leave type)
- Manage personal profile
- View own notification history

### Manager (Employee + Additional)

- Approve or reject leave requests from their department staff
- View department staffing overlaps and calendar for capacity planning
- Assign a covering employee during staff absences
- Receive SLA reminders and act on pending approvals before escalation
- Bulk approve non-conflicting requests
- Apply for their own leave — routed to Admin for approval

### Admin (Full Access)

- All Employee and Manager permissions
- Approve Manager leave requests (routed directly to Admin queue)
- Configure and manage leave type definitions and per-type policies
- Set entitlement rules by service length tier
- Configure global system settings (carry forward, SLA, backdating)
- Manage and schedule Public Holidays (global or regional)
- Onboard new employees (join date, role, department, initial balances)
- Deactivate/offboard employees
- Manually adjust any employee's leave balance (with mandatory audit reason)
- Override or escalate stalled leave approvals
- Generate company-wide leave reports (utilization, liability, headcount)
- Export approved leaves to CSV for payroll processing
- View full audit log of all system actions

---

## Business Rules

This section defines critical business logic that must be enforced in all server actions and validations. **These rules are non-negotiable and must not be bypassed.**

### Leave Entitlement by Service Length

Entitlement tiers apply to Annual Leave only. Values below are defaults (configurable by Admin):

| Service Length | Annual Leave Days |
| -------------- | ----------------- |
| < 2 years      | 16 days           |
| 2 – 5 years    | 18 days           |
| > 5 years      | 22 days           |

- `service_length` is calculated from `users.join_date` to the current date using `Asia/Kuala_Lumpur` timezone
- Entitlement tier is re-evaluated at the start of each leave year
- If a tier threshold is crossed mid-year, the new entitlement applies from the **next** leave year

### Leave Balance Proration (New Hires)

- Employees who join mid-year receive prorated Annual Leave based on remaining months in the leave year
- Formula: `floor((remaining_months / 12) * annual_entitlement)`
- **Minimum floor: 1 day** — an employee who joins with 0 remaining months (e.g., joins on Dec 30) is still entitled to 1 day, never zero
- Sick Leave is granted in full regardless of join date
- `prorateNewHireBalance()` must be called automatically on every new employee creation

### Half-Day Leave Rules

- Half-day (First Half / Second Half) counts as `0.5` days deducted from balance
- Half-day is only available for leave types where `allow_half_day = true` in `leave_type_configs`
- By default, only Annual Leave has `allow_half_day = true`
- Only one half-day application is allowed per calendar day per employee
- The form must filter the Duration Modifier dropdown based on the selected leave type's `allow_half_day` flag — never show half-day options for ineligible types

### Backdated Leave

- Employees may apply for backdated leave up to **7 calendar days** in the past (configurable in `system_settings`)
- The backdated window is calculated using `Asia/Kuala_Lumpur` date — if today is Jan 8, the earliest allowed `start_date` is Jan 1
- Backdated Sick Leave requires a Medical Certificate (MC) attachment — enforced at form validation
- Backdated Annual Leave requires a reason — manager may reject at discretion
- Applications with `start_date` older than the configured window are blocked at the server action level, not just the UI

### Sick Leave Medical Certificate (MC) Requirement

- MC attachment is **mandatory** when sick leave duration is **2 or more consecutive days**
- MC attachment is **optional** for single-day sick leave
- System enforces this at form submission

### Unpaid Leave Balance Check Bypass

- Leave types marked `is_paid = false` (e.g., Unpaid Leave) must **skip** the balance sufficiency check entirely
- The `applyForLeave()` server action must check `leave_type_configs.is_paid` before running balance validation
- Unpaid leave still creates a `leave_requests` record and still requires manager approval

### Cross-Year Leave Requests

- When a leave request spans two leave years (e.g., Dec 28 – Jan 5), the system must **split the deduction automatically**
- Days falling in the current leave year are deducted from the current year's balance
- Days falling in the next leave year are deducted from the next year's balance (creating the next year's balance row if it doesn't yet exist)
- Both deductions must succeed atomically — use a Supabase transaction. If either year has insufficient balance, the whole request is rejected
- The `leave_requests` table stores the full date range as a single record; the split is handled in balance ledger logic only

### Carry Forward Rules

- Only leave types with `is_carry_forward_allowed = true` can be carried forward
- Maximum carry-forward days are defined per leave type in `leave_type_configs`
- Carried-forward days expire on the configured expiry month (e.g., March 31 of the next year)
- Expired carry-forward days are zeroed out by a scheduled Supabase cron job

### Approval Routing Rules

- **Employee leave** → routes to their department's `manager_id` for approval
- **Manager's own leave** → routes directly to Admin; Admin receives a notification identical in format to a normal manager approval notification
- **Department with no active manager** (manager was deactivated before replacement assigned) → auto-routes to Admin as fallback. The submission is not blocked.
- Admin always has override access to approve, reject, or reassign any pending request regardless of routing

### Approval SLA & Escalation

- Managers must act on pending requests within **5 working days** (configurable in `system_settings`)
- Day 3 (Asia/KL time): approver receives a reminder notification
- Day 5 (Asia/KL time): Admin receives an escalation alert; `escalated_at` is set on the request
- Admin can approve, reject, or reassign escalated requests

### Manager Self-Delegation (Absence Coverage)

- When a Manager submits their own leave, they may optionally designate a **delegate approver** from their department's eligible employees (Manager or Admin role only) to handle their team's requests during their absence
- This is set via a `delegate_approver_id` field on the leave request (not on the department)
- The delegate receives a notification when assigned
- `acting_manager_id` on the `departments` table is set when the delegation is confirmed and **must be cleared** by a server action when the manager's approved leave ends — this is handled by the `clearActingManager()` cron job that runs daily and checks if any acting manager's associated leave end date has passed

### Leave Cancellation Rules

- Employees can cancel **Pending** requests at any time — no balance restoration needed (balance was never deducted)
- Employees can cancel **Approved** future leave up to **1 working day** before the start date — `cancelApprovedLeave()` must restore the deducted balance by decrementing `leave_balances.used` by `duration_days`
- For cross-year approved leave cancellations, both year balances must be restored atomically
- Past approved leave cannot be cancelled by employees — Admin must use manual balance adjustment
- Cancellation of any request triggers a notification to the relevant approver

### Leave Encashment (Year-End)

- Unused Annual Leave beyond the carry-forward cap is forfeited at year-end unless encashment is enabled
- Encashment is a toggle in `system_settings` (`encashment_enabled`)
- If enabled, forfeited days are recorded in `leave_encashment_log` for payroll reference — amounts are not auto-calculated or paid by the system

### Balance Calculation

Always calculate effective balance as:

```
effective_balance = allocated + carried_forward - used - pending_in_flight
```

Where `pending_in_flight` = sum of `duration_days` for all requests with `status = 'Pending'` for that user, leave type, and year. This prevents over-application while requests are awaiting approval.

When restoring balance after an approved leave cancellation, decrement `leave_balances.used` — do not touch `allocated` or `carried_forward`.

### Who's Out Today

- The system must maintain a real-time view of employees currently on approved leave
- Logic: `status = 'Approved'` AND `start_date <= today AND end_date >= today` (using Asia/KL date)
- This is used by both the "Who's Out Today" widget (UC008) and the conflict warning on the leave application form

---

## Screen Definitions

### UC001 — Authentication

- **UI-001 Login Page:** Email/password auth, "Remember me", forgot password link, role-based dashboard redirect. New employees land directly on the dashboard on first login — no special onboarding screen.
- **UI-002 Password Management:** Email input → Supabase Auth token-based reset flow

### UC002 — Employee Dashboard

- **UI-003 Main Overview:** Metric cards per leave type (allocated, used, remaining), visual progress bars, recent leave snapshot, "Request Time Off" quick action, unread notification badge, "Who's Out Today" mini widget showing department colleagues currently on leave
- **UI-004 Leave History:** Tabular view — columns: Type, Dates, Duration, Status, Manager Comment. "Cancel" button on Pending; "Cancel Leave" button on future Approved (within cancellation window). Pagination + year/status filters.

### UC003 — Leave Application (All Roles)

- **UI-005 Request Leave Form:**
  - Required: Leave Type, Start/End Date (range picker), Duration Modifier (Full/First Half/Second Half — Half-day options only shown if `leave_type_configs.allow_half_day = true` for the selected type)
  - Conditional required: Reason (required for backdated annual), MC Attachment (required for sick ≥ 2 days)
  - Optional: Covering Employee (dropdown of active employees in same department), Additional Notes
  - **Covering Employee conflict warning:** If the selected covering employee has approved leave overlapping the requested dates, display a visible caution banner — "⚠️ [Name] is on approved leave from [date] to [date]. You may still proceed." Submission is not blocked.
  - **Real-time balance preview:** Show remaining balance after deduction before submission. For cross-year requests, show split: "X days from 2025 balance, Y days from 2026 balance"
  - **Public holiday display:** When dates are selected, show "N working days (M calendar days — X public holiday/holidays excluded)" beneath the date picker
  - **Team conflict warning:** Surface any overlapping approved leaves from the same department for the selected date range
  - Workflow: validate leave type → check `is_paid` (skip balance check if false) → validate balance (including cross-year split) → check backdated window → check MC requirement → submit → notify approver → approve/reject → deduct balance on approval

### UC004 — Team Calendar (All Roles)

- **UI-006 Department Calendar:** Monthly grid, color-coded bars (Green = Approved, Gray = Public Holidays, Blue = Own Pending/Approved leave). Employees see names and dates only — not leave type or reason. Managers see leave type as well.

### UC005 — Approvals Dashboard (Manager & Admin)

- **UI-007 Pending Approvals:** Inbox-style queue — Employee Name, Leave Type, Dates, Total Days, Reason, Attachment link. Shows overlapping department leaves for context. SLA countdown badge (green > 3 days, amber 2–3 days, red < 2 days). Approve/Reject with mandatory comment on rejection. Bulk approve for non-conflicting requests.
- Admin's queue includes Manager leave requests (visually distinguished with a "Manager Leave" badge)

### UC006 — Admin Configuration (Admin Only)

- **UI-008 Holiday Management:** CRUD for Public Holidays — Name, Date, Applicability (Global or Department/Region). Bulk import via CSV.
- **UI-009 Leave Type Management:** CRUD for leave types — Name, Default Quota, Allow Half-Day (Y/N), Carry Forward (Y/N), Max Carry Forward Days, Requires Attachment (Y/N), Attachment Required After N Days, Gender Restriction (None/Male/Female), Paid (Y/N), Active (Y/N).
- **UI-010 Policy Settings:** Entitlement tiers by service length, approval SLA days, backdated leave window (days), encashment toggle, carry-forward expiry month, leave year start month.
- **UI-011 Employee Management:** Add new employee (name, email, department, role, join date). Deactivate employee (preserves history, removes login — blocked if employee is the sole manager of a department with no acting manager assigned). Transfer between departments.
- **UI-012 Reports & Analytics:**
  - Leave utilization by employee / department / leave type
  - Headcount-on-leave report for a given date range
  - Leave liability report (accrued unused balance × daily rate — rate input required)
  - Monthly trend chart of leave applications
  - Payroll CSV export (current or custom month/year range)
- **UI-013 Audit Log:** Read-only table — actor, action, affected record, before/after state, timestamp. Filterable by actor, action type, date range. Manual balance adjustments are prominently tagged with the Admin's mandatory reason.
- **UI-014 Manual Balance Adjustment:** Admin-only form — select employee, select leave type, select year, enter adjustment amount (positive to add, negative to deduct), mandatory reason field. Calls `adjustLeaveBalance()`. Always writes to audit log.

### UC007 — Notifications (All Roles)

- **UI-015 Notification Centre:** Bell icon with unread count badge. Dropdown panel with recent notifications and read/unread state. Full notification history page.
  - Employee receives: submission confirmation, approval/rejection (with comment), cancellation confirmation
  - Manager receives: new request submitted, SLA day-3 reminder, SLA day-5 escalation warning, delegate assignment notification
  - Admin receives: Manager leave request submitted (normal approval notification), escalation alerts, year-end carry-forward processing summary

### UC008 — Who's Out Today (All Roles)

- **UI-016 Who's Out Today Page:** Full-page view of all employees currently on approved leave across the company. Grouped by department. Shows employee name, leave type (visible to Manager and Admin only — Employees see name and dates only), and return date. Filterable by department. Also surfaced as a condensed widget on the Employee Dashboard (department colleagues only).

---

## Navigation Structure

```
Side Navigation
├── Dashboard (Overview & Balances)
├── My Leaves (History)
├── Team Calendar
├── Who's Out Today
├── Notifications
│
├── [Manager Only]
│   └── Team Approvals
│
└── [Admin Only]
    ├── Manage Employees
    ├── Leave Types
    ├── Holiday Calendar
    ├── Leave Policies
    ├── Reports
    └── Audit Log
```

---

## Database Schema

### `users`

| Column                  | Type          | Notes                                          |
| ----------------------- | ------------- | ---------------------------------------------- |
| id                      | UUID (PK)     | References `auth.users`                        |
| email                   | text (unique) |                                                |
| full_name               | text          |                                                |
| role                    | enum          | `Employee`, `Manager`, `Admin`                 |
| department_id           | UUID (FK)     |                                                |
| join_date               | date          | Required for proration and service length tier |
| is_active               | boolean       | `false` = deactivated; blocked at middleware   |
| created_at / updated_at | timestamp     |                                                |

### `departments`

| Column            | Type                        | Notes                                                                                       |
| ----------------- | --------------------------- | ------------------------------------------------------------------------------------------- |
| id                | UUID (PK)                   |                                                                                             |
| name              | text                        |                                                                                             |
| manager_id        | UUID (FK → users)           | Must always reference an active user. Nullable only temporarily during reassignment.        |
| acting_manager_id | UUID (FK → users, nullable) | Set when a manager delegates during their own leave; cleared by `clearActingManager()` cron |

### `leave_type_configs`

| Column                         | Type      | Notes                                                                                           |
| ------------------------------ | --------- | ----------------------------------------------------------------------------------------------- |
| id                             | UUID (PK) |                                                                                                 |
| name                           | text      | e.g., `Annual`, `Sick`, `Unpaid`, `Compassionate`, `Maternity`, `Paternity`, `Marriage`, `Hajj` |
| default_quota                  | decimal   | Days per year                                                                                   |
| allow_half_day                 | boolean   | If false, Duration Modifier dropdown hides half-day options                                     |
| is_carry_forward_allowed       | boolean   |                                                                                                 |
| max_carry_forward_days         | integer   |                                                                                                 |
| requires_attachment            | boolean   |                                                                                                 |
| attachment_required_after_days | integer   | e.g., 1 = MC required if > 1 consecutive day                                                    |
| gender_restriction             | enum      | `None`, `Male`, `Female`                                                                        |
| is_paid                        | boolean   | If false, balance check is skipped in `applyForLeave()`                                         |
| is_active                      | boolean   | Soft delete                                                                                     |

### `leave_balances`

| Column                 | Type                           | Notes                             |
| ---------------------- | ------------------------------ | --------------------------------- |
| id                     | UUID (PK)                      |                                   |
| user_id                | UUID (FK)                      |                                   |
| leave_type_id          | UUID (FK → leave_type_configs) |                                   |
| year                   | integer                        |                                   |
| allocated              | decimal                        |                                   |
| used                   | decimal                        |                                   |
| carried_forward        | decimal                        |                                   |
| carried_forward_expiry | date                           | Nullable                          |
| encashed               | decimal                        | For year-end encashment reference |

**Constraint:** `(user_id, leave_type_id, year)` must be a **unique composite index**. Enforce this at the database level to prevent duplicate balance rows that would cause double-counting in all balance calculations and reports.

### `leave_requests`

| Column                | Type                           | Notes                                                                                               |
| --------------------- | ------------------------------ | --------------------------------------------------------------------------------------------------- |
| id                    | UUID (PK)                      |                                                                                                     |
| user_id               | UUID (FK)                      |                                                                                                     |
| leave_type_id         | UUID (FK → leave_type_configs) |                                                                                                     |
| start_date / end_date | date                           |                                                                                                     |
| duration_days         | decimal                        | Total working days across both years for cross-year requests                                        |
| duration_modifier     | enum                           | `Full`, `First Half`, `Second Half`                                                                 |
| reason                | text                           |                                                                                                     |
| status                | enum                           | `Pending`, `Approved`, `Rejected`, `Cancelled`                                                      |
| approver_id           | UUID (FK → users)              | Set on submission based on routing rules (manager, acting manager, or Admin)                        |
| approver_comment      | text                           |                                                                                                     |
| attachment_url        | text                           |                                                                                                     |
| covering_employee_id  | UUID (FK → users, nullable)    |                                                                                                     |
| delegate_approver_id  | UUID (FK → users, nullable)    | Set when a Manager delegates their team's approvals during their own leave                          |
| is_backdated          | boolean                        | Auto-set when `start_date` (in Asia/KL date) < today's date (in Asia/KL date) at time of submission |
| is_cross_year         | boolean                        | Auto-set when `start_date` and `end_date` fall in different leave years                             |
| escalated_at          | timestamp                      | Nullable; set when escalated to Admin                                                               |
| created_at            | timestamp                      |                                                                                                     |
| updated_at            | timestamp                      |                                                                                                     |

### `public_holidays`

| Column        | Type                | Notes         |
| ------------- | ------------------- | ------------- |
| id            | UUID (PK)           |               |
| date          | date                |               |
| name          | text                |               |
| department_id | UUID (FK, nullable) | Null = global |

### `notifications`

| Column             | Type                                 | Notes                                                                                                                                             |
| ------------------ | ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| id                 | UUID (PK)                            |                                                                                                                                                   |
| user_id            | UUID (FK)                            | Recipient                                                                                                                                         |
| type               | enum                                 | `LeaveSubmitted`, `LeaveApproved`, `LeaveRejected`, `LeaveCancelled`, `ApprovalReminder`, `EscalationAlert`, `DelegateAssigned`, `YearEndSummary` |
| title              | text                                 |                                                                                                                                                   |
| body               | text                                 |                                                                                                                                                   |
| related_request_id | UUID (FK → leave_requests, nullable) |                                                                                                                                                   |
| is_read            | boolean                              | Default `false`                                                                                                                                   |
| created_at         | timestamp                            |                                                                                                                                                   |

### `audit_log`

| Column       | Type              | Notes                                                      |
| ------------ | ----------------- | ---------------------------------------------------------- |
| id           | UUID (PK)         |                                                            |
| actor_id     | UUID (FK → users) |                                                            |
| action       | text              | e.g., `APPROVE_LEAVE`, `ADJUST_BALANCE`, `DEACTIVATE_USER` |
| target_table | text              |                                                            |
| target_id    | UUID              | PK of affected record                                      |
| before_state | jsonb             | Snapshot before change                                     |
| after_state  | jsonb             | Snapshot after change                                      |
| reason       | text              | Mandatory for `ADJUST_BALANCE` actions; optional otherwise |
| created_at   | timestamp         |                                                            |

### `system_settings`

| Column                      | Type            | Notes             |
| --------------------------- | --------------- | ----------------- |
| id                          | PK (single row) |                   |
| approval_sla_days           | integer         | Default 5         |
| backdated_leave_window_days | integer         | Default 7         |
| carry_forward_expiry_month  | integer         | e.g., 3 = March   |
| encashment_enabled          | boolean         | Default false     |
| leave_year_start_month      | integer         | e.g., 1 = January |

### `leave_encashment_log`

| Column        | Type                           | Notes             |
| ------------- | ------------------------------ | ----------------- |
| id            | UUID (PK)                      |                   |
| user_id       | UUID (FK)                      |                   |
| leave_type_id | UUID (FK → leave_type_configs) |                   |
| year          | integer                        |                   |
| days_encashed | decimal                        |                   |
| triggered_by  | enum                           | `System`, `Admin` |
| created_at    | timestamp                      |                   |

---

## Server Actions / API Structure

### Leave Management

```ts
applyForLeave(data: LeaveRequestFormData)
// Validation order: leave type config → is_paid check → balance check (cross-year split if needed)
// → backdated window (Asia/KL date) → MC requirement → covering employee conflict check → submit

cancelLeaveRequest(requestId: string)
// Pending only — no balance restoration needed

cancelApprovedLeave(requestId: string)
// Validates cancellation window. Restores used balance.
// For cross-year requests, restores both years' balances atomically.

approveLeaveRequest(requestId: string, comment?: string)
rejectLeaveRequest(requestId: string, comment: string)
escalateLeaveRequest(requestId: string)         // Admin only
bulkApproveLeaveRequests(requestIds: string[])  // Manager/Admin
```

### Balance & Entitlement

```ts
getLeaveBalance(userId: string, year: number)
recalculateEntitlement(userId: string)          // Re-evaluate service length tier
prorateNewHireBalance(userId: string)           // Auto-called on employee creation. Minimum 1 day floor.
adjustLeaveBalance(userId: string, leaveTypeId: string, year: number, delta: number, reason: string)
// Admin only. delta is positive (add) or negative (deduct). Writes to audit_log with reason.

processYearEndCarryForward()                    // Scheduled cron — Dec 31 (Asia/KL)
expireCarriedForwardBalances()                  // Scheduled cron — 1st of carry_forward_expiry_month (Asia/KL)
```

### Routing Helpers (Internal)

```ts
resolveApprover(userId: string): Promise<UUID>
// Returns: acting_manager_id if set → department manager_id if active → Admin fallback
// Called by applyForLeave() to set approver_id on submission

clearActingManager(departmentId: string)
// Called by cron — clears acting_manager_id when the delegating manager's leave end_date has passed (Asia/KL)
```

### Notifications

```ts
sendNotification(userId: string, type: NotificationType, relatedRequestId?: string)
markNotificationRead(notificationId: string)
markAllNotificationsRead(userId: string)
```

### Admin Configuration

```ts
addPublicHoliday(data: HolidayFormData)
deletePublicHoliday(holidayId: string)
bulkImportPublicHolidays(csvData: string)
createLeaveType(data: LeaveTypeFormData)
updateLeaveType(leaveTypeId: string, data: LeaveTypeFormData)
updateSystemSettings(data: SettingsFormData)
createEmployee(data: NewEmployeeFormData)       // Calls prorateNewHireBalance() internally
deactivateEmployee(userId: string)
// Blocked if user is sole manager of a department with no acting_manager_id set
transferEmployeeDepartment(userId: string, newDepartmentId: string)
```

### Reports

```ts
getLeaveUtilizationReport(filters: ReportFilters)
getHeadcountOnLeaveReport(startDate: string, endDate: string)
// Uses Asia/KL date for "today" comparisons
getLeaveLiabilityReport(year: number, dailyRateMap: Record<string, number>)
exportPayrollCSV(month: number, year: number)
getWhoIsOutToday(): Promise<LeaveRequest[]>
// Returns all approved requests where start_date <= today <= end_date (Asia/KL date)
```

### Audit

```ts
// Internal only — called via service role client by all mutating server actions
writeAuditLog(actorId: string, action: string, targetTable: string, targetId: string, before: object, after: object, reason?: string)
```

---

## Security & Authentication

### Supabase RLS Policies (Mandatory)

- **`leave_requests`:** Users `SELECT`/`INSERT` own. Managers `SELECT`/`UPDATE` where user's `department_id` matches. Admins full access.
- **`leave_balances`:** Users `SELECT` own. Managers `SELECT` their department. Admins `SELECT`/`UPDATE` all.
- **`notifications`:** Users `SELECT`/`UPDATE` (mark read) own only.
- **`audit_log`:** Admins `SELECT` only. No role writes directly — service role only.
- **`leave_type_configs`:** All roles `SELECT`. Admin only `INSERT`/`UPDATE`/`DELETE`.
- **`users`:** Users `SELECT` own + colleagues' name and email in same department. Admins full access.
- **`system_settings`:** All roles `SELECT`. Admin only `UPDATE`.

### Next.js Security

- All Route Handlers and Server Actions must include strict role-based session checks
- Middleware protects routes — redirects unauthorized users away from `/admin` and `/manager` paths
- Deactivated users (`is_active = false`) blocked at middleware level even with a valid Supabase session
- `writeAuditLog` and `adjustLeaveBalance` must use the service role client — never the anon client

---

## Supabase Storage

| Bucket                 | Access                                               |
| ---------------------- | ---------------------------------------------------- |
| `medical-certificates` | RLS restricted to uploader, their manager, and Admin |

---

## Scheduled Jobs (Supabase Cron — all times in Asia/Kuala_Lumpur)

| Job                           | Schedule                                   | Action                                                                                   |
| ----------------------------- | ------------------------------------------ | ---------------------------------------------------------------------------------------- |
| Year-End Carry Forward        | Dec 31, 23:59                              | `processYearEndCarryForward()`                                                           |
| Expire Carry Forward Balances | 1st of `carry_forward_expiry_month`, 00:01 | `expireCarriedForwardBalances()`                                                         |
| Clear Acting Managers         | Daily 00:05                                | `clearActingManager()` for all depts where delegating manager's leave `end_date` < today |
| Approval SLA Reminder         | Daily 09:00                                | Notify approvers with pending requests > 3 working days old                              |
| Approval SLA Escalation       | Daily 09:00                                | Notify Admin for pending requests > 5 working days old, set `escalated_at`               |

---

## Environment Variables

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

---

## UI/UX Conventions

### Status Colors (Consistent across all components)

| Status    | Color   |
| --------- | ------- |
| Approved  | Emerald |
| Pending   | Amber   |
| Rejected  | Rose    |
| Cancelled | Slate   |
| Escalated | Orange  |

### Component Standards

- Use shadcn/ui components as the base component library
- Loading skeletons for all async operations
- Toast notifications for all success/error states
- Fully responsive — Tailwind CSS breakpoints for mobile, tablet, desktop
- Destructive confirmation dialogs (`AlertDialog`) for: cancelling approved leave, deactivating an employee, bulk approvals
- SLA countdown badge on approval cards: green (> 3 days remaining), amber (2–3 days), red (< 2 days)
- Covering employee conflict caution: amber banner, non-blocking
- Manager leave requests in Admin approval queue: distinguished with a "Manager Leave" badge

---

## Error Handling

- Use `try/catch` in all Server Actions
- Return structured responses: `{ success: boolean, error?: string, data?: unknown }`
- Implement global error boundaries in Next.js (`error.tsx`)
- Business rule violations must return descriptive, user-facing error messages — not generic 500s:
  - Insufficient balance: "You have X days remaining. This request requires Y days."
  - Backdated window exceeded: "Leave cannot be applied more than N days in the past."
  - MC required: "A medical certificate is required for sick leave of 2 or more consecutive days."
  - Cross-year insufficient: "Insufficient balance in [year] for the portion of this request falling in that year."
  - Deactivation blocked: "Cannot deactivate this manager — they are the sole manager of [Department]. Please assign a replacement first."

---

## Git Workflow

### Commit Attribution

```
Author: Auni Dalilah
```

- **Do NOT** include AI assistant attribution footers in commit messages

### Commit Format (Conventional Commits)

```
<type>(<scope>): <subject>

<body>
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

### When to Commit

Always commit after:

- ✅ Each complete feature (every use case)
- ✅ Major schema or architecture changes
- ✅ Bug fixes
- ✅ Refactoring
- ✅ Config changes (Tailwind, Next.js, env)

Never commit:

- ❌ Broken or non-compiling code
- ❌ `.env.local` or any file containing secrets

### Pre-Commit Checklist

- [ ] `npm run build` succeeds
- [ ] No TypeScript errors
- [ ] No ESLint warnings
- [ ] RLS policies verified in Supabase dashboard
- [ ] Unique composite index on `leave_balances(user_id, leave_type_id, year)` confirmed

---

## Visual QA Process

After **every** front-end change:

1. Identify what changed — review modified components
2. Navigate to all affected pages using Playwright MCP tools
3. Validate feature against requirements
4. Check browser console for errors
5. Test all interactive states: hover, active, disabled, toast notifications
6. Test modal/slide-over and AlertDialog interactions
7. Test viewports: Desktop (1440px), Tablet (768px), Mobile (375px)
8. Validate semantic HTML and accessible forms (shadcn/ui defaults)
9. Check color contrast ratios for status badges and SLA indicators
10. Verify Date Picker edge cases (past dates beyond backdated window, public holidays, weekends, cross-year ranges)

### Playwright MCP Tools

```
mcp__playwright__browser_navigate
mcp__playwright__browser_click
mcp__playwright__browser_type
mcp__playwright__browser_select_option
mcp__playwright__browser_take_screenshot
mcp__playwright__browser_resize
mcp__playwright__browser_console_messages
```

---

## General Rules

- Always use Context7 when library or API documentation is needed for code generation, setup, or configuration — do not rely on training knowledge for library APIs
- RLS policies are **mandatory** — never expose data without them
- All date business logic must use `Asia/Kuala_Lumpur` (UTC+8). Use `date-fns-tz` for all timezone-aware date operations in server actions
- Half-day availability is driven by `leave_type_configs.allow_half_day` — never hardcoded
- Public Holidays **and weekends** must be excluded when calculating leave day counts
- The Team Calendar and Who's Out Today must **never** expose leave type or reason to Employees — names and dates only
- Leave type definitions must always be fetched from `leave_type_configs` — never hardcoded as enums in application logic
- All mutating server actions must call `writeAuditLog` before returning
- `adjustLeaveBalance()` requires a non-empty `reason` string — reject at server action level if missing
- Deactivated employees (`is_active = false`) must be excluded from all dropdowns, calendars, covering employee lists, and reports
- Balance calculations must always use: `allocated + carried_forward - used - pending_in_flight`
- When restoring a cancelled approved leave, decrement `leave_balances.used` only — never modify `allocated` or `carried_forward`
- Notifications must be non-blocking — failure to send must never cause the primary action to fail
- `prorateNewHireBalance()` must apply a minimum floor of 1 day — never return 0 for Annual Leave regardless of join date
- `resolveApprover()` must always return a valid user ID — fallback to Admin if no manager is found
- The `leave_balances` unique composite index on `(user_id, leave_type_id, year)` must be created in the initial migration — never allow duplicate balance rows
- Maintain progress status in developmentjourney.md
- Use seeddata.md for login credentials.
