# Development Journey — Leave Management System (LMS)

> **Project:** Leave Management System
> **Stack:** Next.js 15 (App Router) · Tailwind CSS 4 · shadcn/ui · Supabase (PostgreSQL + Auth) · Vercel
> **Timezone:** All business logic uses `Asia/Kuala_Lumpur` (UTC+8)
> **Last Updated:** 2026-05-26 (Phase 11 complete)

---

## Current Status

| Phase | Description | Status |
|-------|-------------|--------|
| 0 | Environment & Dependencies | ✅ Done |
| 1 | Database Schema & RLS | ✅ Done |
| 2 | Supabase Client Infrastructure | ✅ Done |
| 3 | UC001 — Authentication | ✅ Done |
| 4 | Layout, Navigation & Session | ✅ Done |
| 5 | Balance & Entitlement Logic | ✅ Done |
| 6 | UC002 — Employee Dashboard | ✅ Done |
| 7 | UC003 — Leave Application | ✅ Done |
| 8 | UC004 — Team Calendar | ✅ Done |
| 9 | UC005 — Approvals Dashboard | ✅ Done |
| 10 | UC007 — Notifications | ✅ Done |
| 11 | UC008 — Who's Out Today | ✅ Done |
| 12 | UC006 — Admin Configuration | ✅ Done |
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

- [x] Create bucket `medical-certificates` — private, 10 MB limit, JPEG/PNG/WEBP/PDF only
- [x] RLS: uploader (`owner = auth.uid()`), their department manager, and Admin can SELECT; uploader-only INSERT (path `{uid}/{filename}`); uploader + Admin UPDATE/DELETE
- Note: SELECT policy uses `owner` column (set by Supabase on upload) to avoid column-name ambiguity in the manager subquery; INSERT/UPDATE/DELETE use path-based check via `storage.foldername(name)[1]`

### Notes

- Circular FK between `departments` and `users` resolved by creating `departments` first without the FK, then adding it via `ALTER TABLE` after `users` exists
- `audit_log.actor_id` is nullable (`ON DELETE SET NULL`) to preserve log history if the actor user is deleted
- Migration file: `supabase/migrations/20260403000000_phase1_schema.sql`

---

## Phase 2 — Supabase Client Infrastructure

**Goal:** Set up typed Supabase clients and middleware.

### Files to Create

- [x] `lib/supabase/client.ts` — `createBrowserClient()` for client components
- [x] `lib/supabase/server.ts` — `createServerClient()` with Next.js cookies for server components & actions
- [x] `lib/supabase/service.ts` — `createClient(SERVICE_ROLE_KEY)` for audit log and admin ops only
- [x] `lib/types/database.ts` — TypeScript types generated via Supabase MCP `generate_typescript_types`
- [x] `lib/types/app.ts` — domain types (User, LeaveRequest, LeaveBalance, Notification, etc.) + form data types + ActionResult
- [x] `middleware.ts` — session refresh + route protection:
  - Redirect unauthenticated users to `/login`
  - Block deactivated users (`is_active = false`) — redirected to `/login?error=deactivated`, allowed to stay on auth routes to sign out
  - Protect `/admin/*` routes (Admin only)
  - Protect `/manager/*` routes (Manager + Admin)
  - Authenticated users on auth routes redirected to their role's home page

---

## Phase 3 — UC001: Authentication

**Screens:** UI-001 (Login), UI-002 (Password Reset)

### Files Created

- [x] `app/(auth)/layout.tsx` — two-column auth layout: branded left panel (desktop) + form right
- [x] `app/(auth)/login/page.tsx`
  - Email + password fields with show/hide toggle
  - "Keep me signed in" checkbox
  - "Forgot password?" link
  - Error banners for wrong credentials and deactivated account
  - Role-based redirect on success: Employee → `/dashboard`, Manager → `/manager`, Admin → `/admin`
- [x] `app/(auth)/reset-password/page.tsx`
  - Email input → triggers Supabase password reset email
  - Success confirmation screen replaces the form
- [x] `app/(auth)/reset-password/update/page.tsx`
  - New password + confirm fields with show/hide toggles
  - Redirects to `/login?message=password_updated` on success
- [x] `app/auth/callback/route.ts` — exchanges Supabase code for session; redirects to `next` param
- [x] `lib/actions/auth.ts`
  - `signIn(prevState, formData)` — Supabase `signInWithPassword`, role-based redirect
  - `signOut()` — Supabase `signOut` → `/login`
  - `sendPasswordReset(prevState, formData)` — Supabase `resetPasswordForEmail`; email enumeration safe
  - `updatePassword(prevState, formData)` — Supabase `updateUser({ password })`
- [x] `middleware.ts` updated — `isAuthRoute` changed to exact match on `/reset-password` so `/reset-password/update` is accessible to authenticated users (recovery session)

### Business Rules
- New employees land directly on the dashboard on first login — no special onboarding screen

---

## Phase 4 — Layout, Navigation & Session Context

**Goal:** Replace the mock role switcher with real session data; implement the full side navigation.

### Files Created/Modified

- [x] `components/providers/SessionProvider.tsx` — React context + `useSession()` hook exposing `SessionUser`
- [x] `components/layout/AppShell.tsx` — client wrapper managing mobile sidebar toggle state
- [x] `app/(app)/layout.tsx` — authenticated server layout: fetches session → `SessionProvider` → `AppShell`
- [x] `components/Sidebar.tsx` — fixed desktop sidebar + mobile drawer overlay; role-aware nav sections:
  ```
  Dashboard · My Leaves · Team Calendar · Who's Out Today · Notifications
  [Manager+Admin] Team Approvals
  [Admin] Manage Employees · Leave Types · Holiday Calendar · Leave Policies · Reports · Audit Log
  ```
  Active route highlighted; user profile + Sign Out at bottom
- [x] `app/(app)/dashboard/page.tsx` — Employee dashboard placeholder (Phase 6)
- [x] `app/(app)/manager/page.tsx` — Manager dashboard placeholder with quick links (Phase 9)
- [x] `app/(app)/admin/page.tsx` — Admin dashboard placeholder with section cards (Phase 12)
- [x] `components/Navbar.tsx` — real user name/role from `useSession()`; notification bell placeholder; hamburger for mobile
- [x] `app/page.tsx` — replaced mock page with `redirect('/dashboard')`
- [x] Fixed `app/(auth)/login/page.tsx` — wrapped `useSearchParams()` in `<Suspense>` (Next.js requirement)
- [x] Fixed `components/EmployeeDashboard.tsx`, `ManagerDashboard.tsx`, `AdminDashboard.tsx` — replaced broken `import { Tab } from '@/app/page'` with inline type

### Notes

- `SessionProvider` is initialized in the server layout and passed to client components via React context
- `AppShell` (client) holds mobile sidebar open/close state; children remain server-rendered (slot pattern)
- Sidebar uses `usePathname()` for active route highlighting; `form action={signOut}` for sign out
- Middleware provides primary route protection; `(app)/layout.tsx` adds a secondary session check

---

## Phase 5 — Balance & Entitlement Logic

**Goal:** Core calculation utilities used by every leave action.

### Files Created

- [x] `lib/utils/dates.ts`
  - `toKLDate(date)` — convert any date to Asia/Kuala_Lumpur date string
  - `getKLToday()` — today's date in KL timezone
  - `getKLTodayDate()` — today as a Date object in KL timezone
  - `isWeekend(date)` — true if Saturday or Sunday
  - `getLeaveYear(date, leaveYearStartMonth)` — which leave year a date belongs to
  - `countCalendarDays(start, end)` — inclusive count
  - `addWorkingDays(date, n, holidays?)` — skip weekends + holidays
  - `subtractWorkingDays(date, n, holidays?)` — for cancellation window checks
  - `parseDate(dateStr)` / `formatDate(date)` — UTC midnight helpers

- [x] `lib/utils/working-days.ts`
  - `countWorkingDays(start, end, holidays[])` — exclude weekends + public holidays (pure, no DB)
  - `getWorkingDaysBetween(start, end, departmentId?)` — fetches holidays from DB, returns `{ workingDays, holidays, calendarDays }`
  - `workingDaysSince(dateStr, holidays?)` — SLA age calculation

- [x] `lib/actions/balance.ts`
  - `getLeaveBalance(userId, year)` → enriched `EffectiveLeaveBalance[]` with `pending_in_flight` and `effective_balance`
  - `prorateNewHireBalance(userId)` → `floor((remaining_months / 12) * entitlement)`, min 1 day; upserts all leave types
  - `recalculateEntitlement(userId)` → re-evaluate service tier; upserts next year's annual leave balance
  - `adjustLeaveBalance(actorId, userId, leaveTypeId, year, delta, reason)` → Admin only; adjusts `allocated`; writes audit log
  - `processYearEndCarryForward()` → cron target; respects `max_carry_forward_days`; sets `carried_forward_expiry`
  - `expireCarriedForwardBalances()` → cron target; zeroes out expired `carried_forward` rows
  - `writeAuditLog(...)` → service role client; non-blocking; used by all mutating actions

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

- [x] `app/(app)/dashboard/page.tsx` — server component fetching real data
- [x] `components/dashboard/BalanceCard.tsx`
  - Metric cards per leave type: allocated, used, remaining
  - Visual progress bar
  - Carry-forward indicator where applicable
- [x] `components/dashboard/RecentLeavesSnapshot.tsx` — last 3–5 requests with status badges
- [x] `components/dashboard/WhoIsOutWidget.tsx` — department colleagues on approved leave today (names + dates only)
- [x] `app/(app)/leaves/page.tsx` — UI-004: leave history page
- [x] `components/leaves/LeaveHistoryTable.tsx`
  - Columns: Type, Dates, Duration, Status, Manager Comment
  - Filters: year, status
  - Pagination
  - "Cancel" button on Pending requests
  - "Cancel Leave" button on future Approved (within 1 working day window)
- [x] `lib/actions/leave.ts`
  - `getUserLeaveHistory(userId, filters)` — paginated query
  - `cancelLeaveRequest(requestId)` — Pending only, no balance change
  - `cancelApprovedLeave(requestId)` — validates 1-working-day window; restores `leave_balances.used`; cross-year restores both years
- [x] `lib/actions/reports.ts` — `getWhoIsOutToday(departmentId?)` (partial — full page in Phase 11)

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

- [x] `app/(app)/leaves/apply/page.tsx` — hosts the form
- [x] `lib/schemas/leave.ts` — Zod validation schemas
- [x] `components/leaves/RequestLeaveForm.tsx` — full form:
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
- [x] `lib/actions/leave.ts` additions:
  - `applyForLeave(formData: FormData)`
    - Validation pipeline (in order):
      1. Fetch leave type config
      2. If `is_paid = false` → skip balance check
      3. Validate backdated window vs `getKLToday()` (server-side, not just UI)
      4. Half-day validation (allow_half_day, single-day check, one per day)
      5. Calculate duration via `getWorkingDaysBetween`
      6. Check effective balance (cross-year split if `is_cross_year`)
      7. Check MC requirement (sick ≥ attachment_required_after_days)
      8. Upload MC to `medical-certificates` bucket if provided
      9. `resolveApprover(userId)` → set `approver_id`
      10. INSERT `leave_requests`
      11. `sendNotification(approverId, 'LeaveSubmitted', requestId)` — non-blocking
      12. `writeAuditLog(...)` — mandatory
    - Returns `{ success, error?, data? }`
  - `getTeamConflictsForDates(departmentId, startDate, endDate)` — overlapping approved dept leaves
  - `getCoveringEmployeeConflict(employeeId, startDate, endDate)` — covering employee leave conflict
- [x] `lib/utils/routing.ts`
  - `resolveApprover(userId)` → `acting_manager_id` → `manager_id` (if active) → Admin fallback
- [x] `lib/actions/notifications.ts`
  - `sendNotification(userId, type, relatedRequestId?)` — non-blocking INSERT via service client
  - `markNotificationRead(notificationId)`
  - `markAllNotificationsRead(userId)`

### Key Business Rules
- Balance check: `effective = allocated + carried_forward - used - pending_in_flight`
- Half-day = 0.5 days; only one half-day per calendar day per employee
- Unpaid leave (`is_paid = false`) skips balance check entirely
- Cross-year request: split deduction atomically; if either year fails → reject whole request
- Backdated window enforced at server action level (not just UI)

---

## Phase 8 — UC004: Team Calendar

**Screen:** UI-006 (Department Calendar)

### Files Created

- [x] `lib/actions/calendar.ts`
  - `getTeamCalendarData(year, month, departmentId?)` — fetches Approved/Pending leaves + public holidays for the month using service-role client (bypasses RLS for team visibility); filters by department at application layer
  - `getDepartments()` — fetches all departments for Admin filter dropdown
- [x] `app/(app)/calendar/page.tsx` — server component; resolves user role + dept; fetches initial calendar data and dept list; passes to client component
- [x] `components/calendar/TeamCalendar.tsx`
  - Monthly grid view (Mon–Sun layout)
  - Emerald bars = Approved team leaves
  - Amber dashed bars = Pending team leaves
  - Blue bars = Own leaves (any status)
  - Orange cells = Public holidays
  - Weekend cells tinted gray
  - **Employees:** see name + dates only — leave type hidden
  - **Managers / Admin:** also see leave type name in bars
  - Month navigation with loading spinner
  - Department filter dropdown (Admin only; Employees/Managers locked to own dept)
  - Legend strip for color coding
  - Tooltip on hover with full details (role-appropriate)

### Notes

- Service-role client used in `getTeamCalendarData` so Employees can see their department's calendar (RLS for `leave_requests` only allows SELECT own — bypassed here intentionally; field-level restriction is applied in the component)
- Month navigation uses `useTransition` + server action — no full page reload; spinner shown during fetch

---

## Phase 9 — UC005: Approvals Dashboard

**Screen:** UI-007 (Pending Approvals)

### Files Created

- [x] `lib/actions/approvals.ts`
  - `getPendingApprovals(userId, userRole)` — Manager sees `approver_id = self`; Admin sees all pending; enriches each request with `sla_days_elapsed` (via `workingDaysSince`) and `overlapping_leaves` (batch-fetched per dept)
  - `approveLeaveRequest(requestId, comment?)` — auth check (assigned approver or Admin); updates status; deducts `leave_balances.used` for paid leave (cross-year aware — mirrors `cancelApprovedLeave` logic in reverse); non-blocking `LeaveApproved` notification; writes audit log
  - `rejectLeaveRequest(requestId, comment)` — mandatory non-empty comment; no balance change; `LeaveRejected` notification; audit log
  - `bulkApproveLeaveRequests(requestIds[])` — approves each sequentially; returns `{ approved[], failed[] }` for partial failure reporting
  - `escalateLeaveRequest(requestId)` — Admin only; sets `escalated_at`; notifies Admin + original approver
  - `getAttachmentSignedUrl(requestId)` — returns 5-min signed URL for MC bucket; auth-gated to approver/Admin
- [x] `components/approvals/RejectDialog.tsx` — Dialog with mandatory textarea; disabled submit when blank
- [x] `components/approvals/BulkApproveDialog.tsx` — AlertDialog listing selected requests; shows name/type/dates/duration; returns `{ approved, failed }` to parent
- [x] `components/approvals/ApprovalCard.tsx`
  - Employee avatar + name, leave type, dates, duration (with half-day label), reason block
  - Backdated / Cross-year / Manager Leave badges
  - Attachment: "View Medical Certificate" button → calls `getAttachmentSignedUrl`, opens tab
  - Overlapping colleagues: collapsible list with amber warning
  - SLA badge: emerald (> 3 days), amber (2–3 days), rose (< 2 days or overdue), orange (escalated)
  - Approve (emerald) + Reject (rose outline) action buttons
- [x] `components/approvals/ApprovalQueue.tsx` — client state manager; search by name/type; select-all checkbox; per-card checkbox; "Approve N" bulk button; stats strip (pending / overdue / escalated counts); empty state
- [x] `app/(app)/manager/approvals/page.tsx` — server component; role-gates (Manager/Admin only, redirects others); fetches queue + SLA limit; renders `ApprovalQueue`

### SLA Rules
- `sla_days_elapsed` computed via `workingDaysSince(created_at)` (weekends excluded, holidays approximated)
- Badge thresholds: > 3 days remaining → emerald; 2–3 days → amber; < 2 days → rose; escalated → orange
- `escalateLeaveRequest` available Admin-only via separate action (cron SLA jobs handled in Phase 13)

---

## Phase 10 — UC007: Notifications

**Screen:** UI-015 (Notification Centre)

### Files Created

- [x] `lib/actions/notifications.ts` — added `getNotificationsPreview(userId, limit?)` returning recent notifications + unread count
- [x] `components/notifications/NotificationItem.tsx` — shared item renderer (icon per type, unread dot, relative timestamp, body text)
- [x] `components/notifications/NotificationBell.tsx` — self-contained client component; BellRing icon + rose badge; DropdownMenu with 5 recent items; optimistic mark-all-read on open
- [x] `components/Navbar.tsx` — replaced static bell placeholder with `<NotificationBell />`
- [x] `app/(app)/notifications/page.tsx` — full history page; notifications grouped Today / Yesterday / Earlier; "Mark all read" form action; empty state

### Notification Types by Role
| Role | Types Received |
|---|---|
| Employee | LeaveSubmitted (confirmation), LeaveApproved, LeaveRejected, LeaveCancelled |
| Manager | LeaveSubmitted (new request), ApprovalReminder (day 3), EscalationAlert (day 5 warning), DelegateAssigned |
| Admin | LeaveSubmitted (manager leave), EscalationAlert, YearEndSummary |

---

## Phase 11 — UC008: Who's Out Today

**Screen:** UI-016 (Who's Out Today Page + Dashboard Widget)

### Files Created/Modified

- [x] `lib/actions/reports.ts`
  - Fixed `getWhoIsOutToday()` to use service-role client (Employees were previously limited by RLS to own requests only — now sees company-wide)
  - Added auth guard (regular client) before using service client
  - Extended `WhoIsOutEntry` with `department_name` via nested join
- [x] `app/(app)/whos-out/page.tsx`
  - Server component; fetches all entries + departments in parallel
  - Passes `userRole`, `userDepartmentId`, entries, departments to client component
- [x] `components/whos-out/WhosOutPage.tsx`
  - Department filter dropdown (Manager/Admin only; Employees locked to own dept, no filter shown)
  - Entries grouped by department name, sorted alphabetically
  - Role-aware display: Employees see name + dates only; Managers/Admin see leave type badge + return date
  - Empty state: "Everyone's in today! 🌟"
  - Responsive: return date hidden on mobile (sm:block)

---

## Phase 12 — UC006: Admin Configuration ✅

**Screens:** UI-008 to UI-014  
**Completed:** 2026-06-04

### 12.1 Employee Management (UI-011)

- [x] `app/(app)/admin/employees/page.tsx`
- [x] `components/admin/EmployeeTable.tsx` — list with search, department filter, deactivate/transfer actions
- [x] `components/admin/AddEmployeeDialog.tsx` — name, email, department, role, join date
- [x] `components/admin/TransferDialog.tsx` — change department
- [x] `lib/actions/admin.ts`
  - `createEmployee(data)` → creates auth user + public.users row + calls `prorateNewHireBalance()`
  - `deactivateEmployee(userId)` → blocked if sole manager with no `acting_manager_id`
  - `transferEmployeeDepartment(userId, newDepartmentId)`

### 12.2 Leave Type Management (UI-009)

- [x] `app/(app)/admin/leave-types/page.tsx`
- [x] `components/admin/LeaveTypeTable.tsx`
- [x] `components/admin/LeaveTypeDialog.tsx` — full field form matching `leave_type_configs` schema
- [x] `lib/actions/admin.ts` additions
  - `createLeaveType(data)`
  - `updateLeaveType(id, data)`
  - (soft delete via `is_active = false`)

### 12.3 Holiday Management (UI-008)

- [x] `app/(app)/admin/holidays/page.tsx`
- [x] `components/admin/HolidayTable.tsx`
- [x] `components/admin/AddHolidayDialog.tsx` — name, date, global or department-specific
- [x] `components/admin/BulkImportDialog.tsx` — CSV paste and batch insert
- [x] `lib/actions/admin.ts` additions
  - `addPublicHoliday(data)`
  - `deletePublicHoliday(id)`
  - `bulkImportPublicHolidays(csvData)` — parse CSV, batch insert

### 12.4 Policy Settings (UI-010)

- [x] `app/(app)/admin/policies/page.tsx`
- [x] `components/admin/PolicySettingsForm.tsx` — entitlement tiers (now DB-driven), SLA days, backdated window, carry-forward expiry month, encashment toggle, leave year start month
- [x] `lib/actions/admin.ts` additions
  - `updateSystemSettings(data)` — saves all fields including 3 new entitlement tier columns
- [x] DB migration: added `entitlement_tier_lt2`, `entitlement_tier_2to5`, `entitlement_tier_gt5` to `system_settings`
- [x] `lib/actions/balance.ts` updated to read entitlement tiers from DB (async)

### 12.5 Reports & Analytics (UI-012)

- [x] `app/(app)/admin/reports/page.tsx` — tabbed layout
- [x] `components/admin/ReportsPage.tsx` — 4 tabs: Utilization, Headcount, Liability, Trend (bar chart)
- [x] `lib/actions/reports.ts` additions
  - `getLeaveUtilizationReport(year, departmentId?, leaveTypeId?)`
  - `getHeadcountOnLeaveReport(startDate, endDate)`
  - `getLeaveLiabilityReport(year, dailyRateMap)`
  - `getLeaveTrend(year)` — monthly application counts
  - `exportPayrollCSV(month, year)` → returns CSV string, triggers download via Blob URL

### 12.6 Audit Log (UI-013)

- [x] `app/(app)/admin/audit-log/page.tsx`
- [x] `components/admin/AuditLogTable.tsx` — read-only; filterable by actor, action type, date range; `ADJUST_BALANCE` tagged amber; paginated 50/page; expandable JSON before/after

### 12.7 Manual Balance Adjustment (UI-014)

- [x] `app/(app)/admin/balance-adjustment/page.tsx`
- [x] `components/admin/BalanceAdjustmentForm.tsx` — employee, leave type, year, delta (+/-), mandatory reason; live balance preview
- [x] Connected to existing `adjustLeaveBalance()` from Phase 5

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
| 2026-04-03 | `fcf6be3` | feat(db): Phase 1 — database schema, RLS policies, seed data |
| 2026-04-03 | — | feat(infra): Phase 2 — Supabase clients, TypeScript types, middleware |
| 2026-04-03 | — | feat(auth): Phase 3 — UC001 authentication, login, password reset |
| 2026-04-03 | — | feat(layout): Phase 4 — layout, sidebar navigation, session context |
| 2026-04-04 | — | feat(dashboard): Phase 5 — balance & entitlement logic |
| 2026-04-04 | — | feat(dashboard): Phase 6 — UC002 employee dashboard, leave history |
| 2026-04-04 | — | feat(leave): Phase 7 — UC003 leave application form, applyForLeave action, notifications |

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
