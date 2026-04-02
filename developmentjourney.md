# Development Journey — Leave Management System (LMS)

> **Project:** Leave Management System
> **Stack:** Next.js 15 (App Router) · Tailwind CSS 4 · shadcn/ui · Supabase (PostgreSQL + Auth) · Vercel
> **Timezone:** All business logic uses `Asia/Kuala_Lumpur` (UTC+8)
> **Last Updated:** 2026-04-03

---

## Current Status

| Phase | Description | Status |
|-------|-------------|--------|
| 0 | Environment & Dependencies | ✅ Done |
| 1 | Database Schema & RLS | ✅ Done |
| 2 | Supabase Client Infrastructure | ⬜ Not Started |
| 3 | UC001 — Authentication | ⬜ Not Started |
| 4 | Layout, Navigation & Session | ⬜ Not Started |
| 5 | Balance & Entitlement Logic | ⬜ Not Started |
| 6 | UC002 — Employee Dashboard | ⬜ Not Started |
| 7 | UC003 — Leave Application | ⬜ Not Started |
| 8 | UC004 — Team Calendar | ⬜ Not Started |
| 9 | UC005 — Approvals Dashboard | ⬜ Not Started |
| 10 | UC007 — Notifications | ⬜ Not Started |
| 11 | UC008 — Who's Out Today | ⬜ Not Started |
| 12 | UC006 — Admin Configuration | ⬜ Not Started |
| 13 | Cron Jobs (Edge Functions) | ⬜ Not Started |
| 14 | Error Boundaries & Polish | ⬜ Not Started |
| 15 | Visual QA & Deployment | ⬜ Not Started |

**Legend:** ✅ Done · 🔄 In Progress · ⬜ Not Started · ❌ Blocked

---

## What Already Exists (Prototype Foundation)

The project was scaffolded with a frontend-only prototype. These files exist but use mock data and have no backend:

| File | Description |
|------|-------------|
| `app/page.tsx` | Landing page with role selector (mock) |
| `app/layout.tsx` | Root layout — Nunito font, ThemeProvider |
| `components/Navbar.tsx` | Navigation with mock role switcher |
| `components/EmployeeDashboard.tsx` | Balance cards + leave history UI (mock data) |
| `components/ManagerDashboard.tsx` | Approval card grid (mock data) |
| `components/AdminDashboard.tsx` | Holidays, policies, reports UI (mock data) |
| `components/DateRangePicker.tsx` | Custom calendar widget (UI only) |
| `components/TeamCalendar.tsx` | Stub component |
| `data/mockData.json` | Sample users, requests, holidays |
| `lib/utils.ts` | `cn()` Tailwind class merger |
| `hooks/use-mobile.ts` | Responsive breakpoint hook |

---

## Phase 0 — Environment & Dependencies

**Goal:** Install all required packages, configure Supabase environment variables, set up shadcn/ui.

### Tasks

- [x] Install Supabase client libraries — `@supabase/supabase-js@^2.101.1`, `@supabase/ssr@^0.10.0`
- [x] Install date utilities — `date-fns@^4.1.0`, `date-fns-tz@^3.2.0`
- [x] Install form validation — `react-hook-form@^7.72.0`, `@hookform/resolvers` (pre-existing), `zod@^4.3.6`
- [x] Install toast notifications — `sonner@^2.0.7`
- [x] Initialise shadcn/ui — created `components.json` manually for Tailwind v4 (config: "", zinc base, new-york style)
- [x] Install core shadcn/ui components — button, input, label, select, textarea, dialog, alert-dialog, badge, card, table, tabs, skeleton, sonner, dropdown-menu, popover, calendar, form
- [x] Create `.env.local` with Supabase credentials (empty placeholders — fill before running)
- [x] Update `.env.example` with Supabase variable names
- [x] Fix `next.config.ts` — removed `eslint: { ignoreDuringBuilds: true }`

---

## Phase 1 — Database Schema & RLS Policies

**Goal:** Create all 10 tables with correct relationships, enums, indexes, and row-level security.

### 1.1 Enums

- [x] `user_role` → `Employee`, `Manager`, `Admin`
- [x] `leave_status` → `Pending`, `Approved`, `Rejected`, `Cancelled`
- [x] `duration_modifier_enum` → `Full`, `First Half`, `Second Half`
- [x] `gender_restriction_enum` → `None`, `Male`, `Female`
- [x] `notification_type_enum` → `LeaveSubmitted`, `LeaveApproved`, `LeaveRejected`, `LeaveCancelled`, `ApprovalReminder`, `EscalationAlert`, `DelegateAssigned`, `YearEndSummary`
- [x] `encashment_trigger_enum` → `System`, `Admin`

### 1.2 Tables (in dependency order)

- [x] **`departments`** — `id`, `name`, `manager_id` (FK → users, nullable during reassignment), `acting_manager_id` (FK → users, nullable)
- [x] **`users`** — `id` (FK → auth.users), `email`, `full_name`, `role`, `department_id` (FK → departments), `join_date`, `is_active`, `created_at`, `updated_at`
- [x] **`leave_type_configs`** — `id`, `name`, `default_quota`, `allow_half_day`, `is_carry_forward_allowed`, `max_carry_forward_days`, `requires_attachment`, `attachment_required_after_days`, `gender_restriction`, `is_paid`, `is_active`
- [x] **`public_holidays`** — `id`, `date`, `name`, `department_id` (nullable = global)
- [x] **`system_settings`** — single-row: `approval_sla_days` (5), `backdated_leave_window_days` (7), `carry_forward_expiry_month` (3), `encashment_enabled` (false), `leave_year_start_month` (1)
- [x] **`leave_balances`** — `id`, `user_id`, `leave_type_id`, `year`, `allocated`, `used`, `carried_forward`, `carried_forward_expiry`, `encashed`
- [x] **`leave_requests`** — `id`, `user_id`, `leave_type_id`, `start_date`, `end_date`, `duration_days`, `duration_modifier`, `reason`, `status`, `approver_id`, `approver_comment`, `attachment_url`, `covering_employee_id`, `delegate_approver_id`, `is_backdated`, `is_cross_year`, `escalated_at`, `created_at`, `updated_at`
- [x] **`notifications`** — `id`, `user_id`, `type`, `title`, `body`, `related_request_id`, `is_read`, `created_at`
- [x] **`audit_log`** — `id`, `actor_id`, `action`, `target_table`, `target_id`, `before_state`, `after_state`, `reason`, `created_at`
- [x] **`leave_encashment_log`** — `id`, `user_id`, `leave_type_id`, `year`, `days_encashed`, `triggered_by`, `created_at`

### 1.3 Critical Index

- [x] **Unique composite index** on `leave_balances(user_id, leave_type_id, year)` — via `UNIQUE` constraint (prevents duplicate balance rows)

### 1.4 RLS Policies

- [x] `leave_requests` — users SELECT/INSERT own; managers SELECT/UPDATE by department; admins full access
- [x] `leave_balances` — users SELECT own; managers SELECT their department; admins SELECT/UPDATE all
- [x] `notifications` — users SELECT/UPDATE own only
- [x] `audit_log` — admins SELECT only; service role INSERT only (no direct role writes)
- [x] `leave_type_configs` — all roles SELECT; admin INSERT/UPDATE/DELETE
- [x] `users` — users SELECT own + same-department colleagues (name + email only); admins full access
- [x] `system_settings` — all roles SELECT; admin UPDATE only
- [x] `public_holidays` — all roles SELECT; admin INSERT/UPDATE/DELETE
- [x] `departments` — all roles SELECT; admin INSERT/UPDATE
- [x] Helper functions: `get_user_role()`, `get_user_department_id()` — SECURITY DEFINER to avoid RLS recursion

### 1.5 Seed Data

- [x] Default leave types: Annual (16d, half-day ✓, carry-forward ✓), Sick (14d, MC after 1d), Unpaid (unpaid), Compassionate (3d), Maternity (60d, female), Paternity (7d, male), Marriage (3d), Hajj (10d)
- [x] Default `system_settings` row (single row insert)

### 1.6 Supabase Storage

- [ ] Create bucket `medical-certificates`
- [ ] RLS: uploader, their manager, and Admin can access

### Notes

- Circular FK between `departments` and `users` resolved by creating `departments` first without the FK, then adding it via `ALTER TABLE` after `users` exists
- `audit_log.actor_id` is nullable (`ON DELETE SET NULL`) to preserve log history if the actor user is deleted
- Migration file: `supabase/migrations/20260403000000_phase1_schema.sql`

---

## Phase 2 — Supabase Client Infrastructure

**Goal:** Set up typed Supabase clients and middleware.

### Files to Create

- [ ] `lib/supabase/client.ts` — `createBrowserClient()` for client components
- [ ] `lib/supabase/server.ts` — `createServerClient()` with Next.js cookies for server components & actions
- [ ] `lib/supabase/service.ts` — `createClient(SERVICE_ROLE_KEY)` for audit log and admin ops only
- [ ] `lib/types/database.ts` — TypeScript types generated via `supabase gen types typescript`
- [ ] `lib/types/app.ts` — domain types (User, LeaveRequest, LeaveBalance, Notification, etc.)
- [ ] `middleware.ts` — session refresh + route protection:
  - Redirect unauthenticated users to `/login`
  - Block deactivated users (`is_active = false`) even with valid session
  - Protect `/admin/*` routes (Admin only)
  - Protect `/manager/*` routes (Manager + Admin)

---

## Phase 3 — UC001: Authentication

**Screens:** UI-001 (Login), UI-002 (Password Reset)

### Files to Create

- [ ] `app/(auth)/layout.tsx` — centered card layout for auth pages
- [ ] `app/(auth)/login/page.tsx`
  - Email + password fields
  - "Remember me" checkbox
  - "Forgot password?" link
  - Role-based redirect on success: Employee → `/dashboard`, Manager → `/manager`, Admin → `/admin`
- [ ] `app/(auth)/reset-password/page.tsx`
  - Email input → triggers Supabase password reset email
  - Token-based reset flow (Supabase handles the link)
- [ ] `lib/actions/auth.ts`
  - `signIn(email, password)` — Supabase `signInWithPassword`
  - `signOut()` — Supabase `signOut`
  - `sendPasswordReset(email)` — Supabase `resetPasswordForEmail`
  - `updatePassword(newPassword)` — for the reset callback

### Business Rules
- New employees land directly on the dashboard on first login — no special onboarding screen

---

## Phase 4 — Layout, Navigation & Session Context

**Goal:** Replace the mock role switcher with real session data; implement the full side navigation.

### Files to Create/Modify

- [ ] `components/providers/SessionProvider.tsx` — React context exposing `user`, `role`, `departmentId`
- [ ] `app/(app)/layout.tsx` — authenticated wrapper with `<Sidebar>` + `<SessionProvider>`
- [ ] `components/Sidebar.tsx` — role-aware side navigation:
  ```
  Dashboard · My Leaves · Team Calendar · Who's Out Today · Notifications
  [Manager] Team Approvals
  [Admin] Manage Employees · Leave Types · Holiday Calendar · Leave Policies · Reports · Audit Log
  ```
- [ ] `app/(app)/dashboard/page.tsx` — Employee dashboard route
- [ ] `app/(app)/manager/page.tsx` — Manager dashboard route
- [ ] `app/(app)/admin/page.tsx` — Admin dashboard route
- [ ] Update `components/Navbar.tsx` — show real user name/role from session, remove mock switcher

---

## Phase 5 — Balance & Entitlement Logic

**Goal:** Core calculation utilities used by every leave action.

### Files to Create

- [ ] `lib/utils/dates.ts`
  - `toKLDate(date)` — convert any date to Asia/Kuala_Lumpur date string
  - `getKLToday()` — today's date in KL timezone
  - `isWeekend(date)` — true if Saturday or Sunday
  - `getLeaveYear(date, leaveYearStartMonth)` — which leave year a date belongs to
  - `countCalendarDays(start, end)` — inclusive count
  - `addWorkingDays(date, n)` — skip weekends + holidays

- [ ] `lib/utils/working-days.ts`
  - `countWorkingDays(start, end, holidays[])` — exclude weekends + public holidays
  - `getWorkingDaysBetween(start, end, departmentId?)` — fetches holidays from DB

- [ ] `lib/actions/balance.ts`
  - `getLeaveBalance(userId, year)` → `{ allocated, used, carried_forward, effective_balance, pending_in_flight }`
    - Formula: `effective = allocated + carried_forward - used - pending_in_flight`
  - `prorateNewHireBalance(userId)` → `floor((remaining_months / 12) * entitlement)`, min 1 day
  - `recalculateEntitlement(userId)` → re-evaluate service tier from `join_date`
  - `adjustLeaveBalance(userId, leaveTypeId, year, delta, reason)` → Admin only, writes audit log
  - `processYearEndCarryForward()` → cron target
  - `expireCarriedForwardBalances()` → cron target

### Entitlement Tiers (default, configurable)
| Service Length | Annual Leave |
|---|---|
| < 2 years | 16 days |
| 2–5 years | 18 days |
| > 5 years | 22 days |

---

## Phase 6 — UC002: Employee Dashboard

**Screens:** UI-003 (Main Overview), UI-004 (Leave History)

### Files to Create/Modify

- [ ] `app/(app)/dashboard/page.tsx` — server component fetching real data
- [ ] `components/dashboard/BalanceCard.tsx`
  - Metric cards per leave type: allocated, used, remaining
  - Visual progress bar
  - Carry-forward indicator where applicable
- [ ] `components/dashboard/RecentLeavesSnapshot.tsx` — last 3–5 requests with status badges
- [ ] `components/dashboard/WhoIsOutWidget.tsx` — department colleagues on approved leave today (names + dates only)
- [ ] `app/(app)/leaves/page.tsx` — UI-004: leave history page
- [ ] `components/leaves/LeaveHistoryTable.tsx`
  - Columns: Type, Dates, Duration, Status, Manager Comment
  - Filters: year, status
  - Pagination
  - "Cancel" button on Pending requests
  - "Cancel Leave" button on future Approved (within 1 working day window)
- [ ] `lib/actions/leave.ts`
  - `getUserLeaveHistory(userId, filters)` — paginated query

### Status Colors
| Status | Color |
|---|---|
| Approved | Emerald |
| Pending | Amber |
| Rejected | Rose |
| Cancelled | Slate |
| Escalated | Orange |

---

## Phase 7 — UC003: Leave Application

**Screen:** UI-005 (Request Leave Form)

### Files to Create

- [ ] `app/(app)/leaves/apply/page.tsx` — hosts the form
- [ ] `lib/schemas/leave.ts` — Zod validation schemas
- [ ] `components/leaves/RequestLeaveForm.tsx` — full form:
  - Leave type selector (fetched from `leave_type_configs` where `is_active = true`)
  - Date range picker — highlights public holidays, blocks weekends
  - Duration modifier dropdown — hides `First Half`/`Second Half` if `allow_half_day = false`
  - Reason field — required when backdated annual leave
  - MC file upload — required when sick leave ≥ 2 consecutive days
  - Covering employee dropdown — active employees in same department only
  - Covering employee conflict caution: amber banner (non-blocking)
  - Real-time balance preview: "X days remaining after this request"
  - Cross-year preview: "X days from 2025, Y days from 2026"
  - Public holiday info: "N working days (M calendar days — X holidays excluded)"
  - Team conflict warning — overlapping approved leaves from same department
- [ ] `lib/actions/leave.ts` additions:
  - `applyForLeave(data: LeaveRequestFormData)`
    - Validation pipeline (in order):
      1. Fetch leave type config
      2. If `is_paid = false` → skip balance check
      3. Check effective balance (cross-year split if `is_cross_year`)
      4. Validate backdated window vs `getKLToday()` (server-side, not just UI)
      5. Check MC requirement (sick ≥ 2 days)
      6. Upload MC to `medical-certificates` bucket if provided
      7. `resolveApprover(userId)` → set `approver_id`
      8. INSERT `leave_requests`
      9. `sendNotification(approverId, 'LeaveSubmitted', requestId)` — non-blocking
      10. `writeAuditLog(...)` — mandatory
    - Returns `{ success, error?, data? }`
  - `cancelLeaveRequest(requestId)` — Pending only, no balance change
  - `cancelApprovedLeave(requestId)` — validates 1-working-day window; restores `leave_balances.used`; cross-year restores both years atomically
- [ ] `lib/utils/routing.ts`
  - `resolveApprover(userId)` → `acting_manager_id` → `manager_id` (if active) → Admin fallback

### Key Business Rules
- Balance check: `effective = allocated + carried_forward - used - pending_in_flight`
- Half-day = 0.5 days; only one half-day per calendar day per employee
- Unpaid leave (`is_paid = false`) skips balance check entirely
- Cross-year request: split deduction atomically; if either year fails → reject whole request
- Backdated window enforced at server action level (not just UI)

---

## Phase 8 — UC004: Team Calendar

**Screen:** UI-006 (Department Calendar)

### Files to Create

- [ ] `app/(app)/calendar/page.tsx`
- [ ] `components/calendar/TeamCalendar.tsx`
  - Monthly grid view
  - Green bars = Approved leaves (employee names + dates)
  - Gray blocks = Public holidays
  - Blue = Own Pending/Approved leaves
  - **Employees:** see names and dates only — NOT leave type or reason
  - **Managers:** also see leave type
  - Month navigation (prev/next)
  - Department filter

---

## Phase 9 — UC005: Approvals Dashboard

**Screen:** UI-007 (Pending Approvals)

### Files to Create

- [ ] `app/(app)/manager/approvals/page.tsx`
- [ ] `components/approvals/ApprovalQueue.tsx` — inbox-style list
- [ ] `components/approvals/ApprovalCard.tsx`
  - Employee name, leave type, dates, total days, reason, attachment link
  - Overlapping department leaves for context
  - SLA countdown badge: green (> 3 days), amber (2–3 days), red (< 2 days)
  - "Manager Leave" badge for Manager requests in Admin queue
  - Approve / Reject buttons
- [ ] `components/approvals/RejectDialog.tsx` — Dialog with mandatory comment field
- [ ] `components/approvals/BulkApproveDialog.tsx` — AlertDialog, checks for conflicts
- [ ] `lib/actions/approvals.ts`
  - `approveLeaveRequest(requestId, comment?)` — updates status, deducts `leave_balances.used`, notifies employee, writes audit log
  - `rejectLeaveRequest(requestId, comment)` — mandatory comment, notifies employee, writes audit log
  - `bulkApproveLeaveRequests(requestIds[])` — validates no conflicts, approves all, notifies all
  - `escalateLeaveRequest(requestId)` — Admin only; sets `escalated_at`

### SLA Rules
- Day 3 (KL time): approver gets reminder notification
- Day 5 (KL time): Admin gets escalation alert; `escalated_at` set on request
- Admin can approve/reject/reassign escalated requests

---

## Phase 10 — UC007: Notifications

**Screen:** UI-015 (Notification Centre)

### Files to Create

- [ ] `app/(app)/notifications/page.tsx` — full notification history page
- [ ] `components/notifications/NotificationBell.tsx` — bell icon in Navbar with unread count badge
- [ ] `components/notifications/NotificationPanel.tsx` — dropdown: recent notifications, read/unread state, "Mark all read" action
- [ ] `lib/actions/notifications.ts`
  - `sendNotification(userId, type, relatedRequestId?)` — INSERT to notifications; **non-blocking** (never fails the parent action)
  - `markNotificationRead(notificationId)`
  - `markAllNotificationsRead(userId)`

### Notification Types by Role
| Role | Types Received |
|---|---|
| Employee | LeaveSubmitted (confirmation), LeaveApproved, LeaveRejected, LeaveCancelled |
| Manager | LeaveSubmitted (new request), ApprovalReminder (day 3), EscalationAlert (day 5 warning), DelegateAssigned |
| Admin | LeaveSubmitted (manager leave), EscalationAlert, YearEndSummary |

---

## Phase 11 — UC008: Who's Out Today

**Screen:** UI-016 (Who's Out Today Page + Dashboard Widget)

### Files to Create

- [ ] `app/(app)/whos-out/page.tsx`
  - Full-page view: all employees on approved leave today, grouped by department
  - **Employees:** see name + dates only
  - **Managers + Admin:** also see leave type and return date
  - Department filter
- [ ] `components/dashboard/WhoIsOutWidget.tsx` — condensed widget (department colleagues only) for Employee Dashboard
- [ ] `lib/actions/reports.ts`
  - `getWhoIsOutToday()` → `status = 'Approved' AND start_date <= KL_today AND end_date >= KL_today`

---

## Phase 12 — UC006: Admin Configuration

**Screens:** UI-008 to UI-014

### 12.1 Employee Management (UI-011)

- [ ] `app/(app)/admin/employees/page.tsx`
- [ ] `components/admin/EmployeeTable.tsx` — list with search, department filter, deactivate/transfer actions
- [ ] `components/admin/AddEmployeeDialog.tsx` — name, email, department, role, join date
- [ ] `components/admin/TransferDialog.tsx` — change department
- [ ] `lib/actions/admin.ts`
  - `createEmployee(data)` → creates auth user + public.users row + calls `prorateNewHireBalance()`
  - `deactivateEmployee(userId)` → blocked if sole manager with no `acting_manager_id`
  - `transferEmployeeDepartment(userId, newDepartmentId)`

### 12.2 Leave Type Management (UI-009)

- [ ] `app/(app)/admin/leave-types/page.tsx`
- [ ] `components/admin/LeaveTypeTable.tsx`
- [ ] `components/admin/LeaveTypeDialog.tsx` — full field form matching `leave_type_configs` schema
- [ ] `lib/actions/admin.ts` additions
  - `createLeaveType(data)`
  - `updateLeaveType(id, data)`
  - (soft delete via `is_active = false`)

### 12.3 Holiday Management (UI-008)

- [ ] `app/(app)/admin/holidays/page.tsx`
- [ ] `components/admin/HolidayTable.tsx`
- [ ] `components/admin/AddHolidayDialog.tsx` — name, date, global or department-specific
- [ ] `components/admin/BulkImportHolidaysDialog.tsx` — CSV upload
- [ ] `lib/actions/admin.ts` additions
  - `addPublicHoliday(data)`
  - `deletePublicHoliday(id)`
  - `bulkImportPublicHolidays(csvData)` — parse CSV, batch insert

### 12.4 Policy Settings (UI-010)

- [ ] `app/(app)/admin/policies/page.tsx`
- [ ] `components/admin/PolicySettingsForm.tsx` — entitlement tiers, SLA days, backdated window, carry-forward expiry month, encashment toggle, leave year start month
- [ ] `lib/actions/admin.ts` additions
  - `updateSystemSettings(data)`

### 12.5 Reports & Analytics (UI-012)

- [ ] `app/(app)/admin/reports/page.tsx` — tabbed layout
- [ ] `components/admin/reports/UtilizationReport.tsx`
- [ ] `components/admin/reports/HeadcountReport.tsx`
- [ ] `components/admin/reports/LiabilityReport.tsx` — daily rate input required
- [ ] `components/admin/reports/MonthlyTrendChart.tsx`
- [ ] `lib/actions/reports.ts` additions
  - `getLeaveUtilizationReport(filters)`
  - `getHeadcountOnLeaveReport(startDate, endDate)`
  - `getLeaveLiabilityReport(year, dailyRateMap)`
  - `exportPayrollCSV(month, year)` → returns CSV string, triggers download

### 12.6 Audit Log (UI-013)

- [ ] `app/(app)/admin/audit-log/page.tsx`
- [ ] `components/admin/AuditLogTable.tsx` — read-only; filterable by actor, action type, date range; `ADJUST_BALANCE` prominently tagged
- [ ] `lib/actions/audit.ts`
  - `writeAuditLog(actorId, action, targetTable, targetId, before, after, reason?)` — service role client only

### 12.7 Manual Balance Adjustment (UI-014)

- [ ] `app/(app)/admin/balance-adjustment/page.tsx`
- [ ] `components/admin/BalanceAdjustmentForm.tsx` — employee, leave type, year, delta (+/-), mandatory reason
- [ ] Connected to `adjustLeaveBalance()` from Phase 5

---

## Phase 13 — Cron Jobs (Supabase Edge Functions)

**Goal:** Automated scheduled background tasks.

All times in `Asia/Kuala_Lumpur`. Use Supabase `pg_cron` or Edge Function + cron schedule.

| Job | Schedule | Function |
|-----|----------|----------|
| Year-End Carry Forward | Dec 31 at 23:59 | `processYearEndCarryForward()` |
| Expire Carry Forward Balances | 1st of `carry_forward_expiry_month` at 00:01 | `expireCarriedForwardBalances()` |
| Clear Acting Managers | Daily at 00:05 | `clearActingManager()` for all depts where leave `end_date` < today |
| Approval SLA Reminder | Daily at 09:00 | Notify approvers with pending > 3 working days old |
| Approval SLA Escalation | Daily at 09:00 | Notify Admin + set `escalated_at` for pending > 5 working days old |

### Files to Create

- [ ] `supabase/functions/year-end-carry-forward/index.ts`
- [ ] `supabase/functions/expire-carry-forward/index.ts`
- [ ] `supabase/functions/clear-acting-managers/index.ts`
- [ ] `supabase/functions/sla-checker/index.ts` — handles both reminder and escalation

---

## Phase 14 — Error Boundaries, Loading States & Polish

**Goal:** Production-quality UX throughout.

### Files to Create

- [ ] `app/error.tsx` — global error boundary (Next.js convention)
- [ ] `app/(app)/dashboard/loading.tsx` — skeleton loader
- [ ] `app/(app)/leaves/loading.tsx`
- [ ] `app/(app)/leaves/apply/loading.tsx`
- [ ] `app/(app)/calendar/loading.tsx`
- [ ] `app/(app)/manager/approvals/loading.tsx`
- [ ] `app/(app)/notifications/loading.tsx`
- [ ] `app/(app)/whos-out/loading.tsx`
- [ ] `app/(app)/admin/*/loading.tsx` — skeleton for each admin page
- [ ] `components/ui/skeleton-card.tsx` — reusable skeleton variants

### Polish Checklist
- [ ] `sonner` Toaster integrated in root layout — all success/error states use toasts
- [ ] `AlertDialog` on: cancel approved leave, deactivate employee, bulk approve
- [ ] All dropdowns exclude `is_active = false` employees
- [ ] Status badges use consistent Tailwind color mapping (Emerald/Amber/Rose/Slate/Orange)
- [ ] SLA badge color logic: `> 3 days` green, `2–3 days` amber, `< 2 days` red
- [ ] "Manager Leave" badge in Admin approval queue
- [ ] Covering employee conflict caution: amber non-blocking banner

---

## Phase 15 — Visual QA & Deployment

**Goal:** Verify everything works end-to-end before shipping.

### Pre-Commit Checklist
- [ ] `npm run build` succeeds — no TypeScript errors, no ESLint warnings
- [ ] RLS policies verified in Supabase dashboard for all tables
- [ ] Unique composite index on `leave_balances(user_id, leave_type_id, year)` confirmed in DB
- [ ] `.env.local` is in `.gitignore` (never commit secrets)

### Visual QA (Playwright MCP)
- [ ] **UC001:** Login, wrong password error, password reset flow
- [ ] **UC002:** Balance cards show real data; leave history loads with filters; cancel pending works; cancel approved within window works
- [ ] **UC003:** All form validations fire correctly; MC upload works; cross-year preview shows split; team conflict warning appears; balance preview updates live
- [ ] **UC004:** Calendar renders with correct color-coding; employees cannot see leave types; month navigation works
- [ ] **UC005:** Approval queue shows SLA badge; approve/reject flow works; bulk approve dialog fires; escalation route works
- [ ] **UC006:** All admin CRUD operations work; CSV export downloads; audit log displays; balance adjustment writes to log
- [ ] **UC007:** Bell badge increments on new notification; dropdown panel shows unread; mark all read works
- [ ] **UC008:** Who's Out Today shows correct employees; grouped by department; employees see names only

### Viewport Testing
- [ ] Desktop 1440px
- [ ] Tablet 768px
- [ ] Mobile 375px

### Deployment
- [ ] Push to `main` branch
- [ ] Vercel deployment succeeds
- [ ] Set Supabase environment variables in Vercel project settings
- [ ] Test production URL end-to-end

---

## Completed Commits

| Date | Commit | Description |
|------|--------|-------------|
| — | `aa254cf` | Initial commit |
| — | `fc585f9` | feat: Setup base project structure and dependencies |
| 2026-04-02 | `cd78cf7` | feat(setup): Phase 0 — environment and dependencies |
| 2026-04-03 | — | feat(db): Phase 1 — database schema, RLS policies, seed data |

---

## Key Architecture Decisions

| Decision | Rationale |
|----------|-----------|
| All dates use `Asia/Kuala_Lumpur` via `date-fns-tz` | Business rules are timezone-sensitive; UTC comparisons would be incorrect |
| Balance formula: `allocated + carried_forward - used - pending_in_flight` | Prevents over-application while requests are awaiting approval |
| Service role client for `writeAuditLog` and `adjustLeaveBalance` | Bypasses RLS for system-level operations; never exposed to client |
| `sendNotification()` is non-blocking | Notification failure must never cause the primary action to fail |
| `resolveApprover()` always returns a valid UUID | Falls back to Admin — submission is never blocked by missing manager |
| Unique composite index on `leave_balances(user_id, leave_type_id, year)` | Prevents double-counting in all balance calculations and reports |
| Cross-year balance deduction is atomic | If either year fails → reject the whole request |
| RLS policies are mandatory on all tables | Security is enforced at the database level, not just application logic |

---

## Conventions & Rules Summary

- **Commit author:** `Auni Dalilah` — no AI attribution footers
- **Commit format:** Conventional Commits — `feat(scope): subject`
- **Never hardcode** leave types as enums — always fetch from `leave_type_configs`
- **Never expose** leave type or reason to Employees in calendar or Who's Out
- **All mutating server actions** must call `writeAuditLog` before returning
- **`adjustLeaveBalance()`** requires a non-empty `reason` — reject at server action level
- **Deactivated employees** excluded from all dropdowns, calendars, and reports
- **Balance restoration** on cancellation: decrement `leave_balances.used` only — never touch `allocated` or `carried_forward`
- **`prorateNewHireBalance()`** minimum floor = 1 day (never return 0)
