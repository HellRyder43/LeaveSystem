-- =================================================================
-- Phase 1: Database Schema, Indexes, RLS Policies & Seed Data
-- Leave Management System (LMS)
-- Timezone: Asia/Kuala_Lumpur (UTC+8)
-- =================================================================

-- =================================================================
-- 1.1 ENUMS
-- =================================================================

CREATE TYPE public.user_role AS ENUM ('Employee', 'Manager', 'Admin');
CREATE TYPE public.leave_status AS ENUM ('Pending', 'Approved', 'Rejected', 'Cancelled');
CREATE TYPE public.duration_modifier_enum AS ENUM ('Full', 'First Half', 'Second Half');
CREATE TYPE public.gender_restriction_enum AS ENUM ('None', 'Male', 'Female');
CREATE TYPE public.notification_type_enum AS ENUM (
  'LeaveSubmitted',
  'LeaveApproved',
  'LeaveRejected',
  'LeaveCancelled',
  'ApprovalReminder',
  'EscalationAlert',
  'DelegateAssigned',
  'YearEndSummary'
);
CREATE TYPE public.encashment_trigger_enum AS ENUM ('System', 'Admin');

-- =================================================================
-- 1.2 TABLES (dependency order)
-- =================================================================

-- departments: manager_id FK added after users to resolve circular dependency
CREATE TABLE public.departments (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name              text NOT NULL,
  manager_id        uuid,
  acting_manager_id uuid
);

-- users: references auth.users and departments
CREATE TABLE public.users (
  id            uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email         text UNIQUE NOT NULL,
  full_name     text NOT NULL,
  role          public.user_role NOT NULL DEFAULT 'Employee',
  department_id uuid REFERENCES public.departments(id) ON DELETE SET NULL,
  join_date     date NOT NULL,
  is_active     boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

-- Resolve circular FK: departments → users (added after users table exists)
ALTER TABLE public.departments
  ADD CONSTRAINT departments_manager_id_fkey
    FOREIGN KEY (manager_id) REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE public.departments
  ADD CONSTRAINT departments_acting_manager_id_fkey
    FOREIGN KEY (acting_manager_id) REFERENCES public.users(id) ON DELETE SET NULL;

-- leave_type_configs
CREATE TABLE public.leave_type_configs (
  id                             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name                           text NOT NULL,
  default_quota                  decimal(6,2) NOT NULL,
  allow_half_day                 boolean NOT NULL DEFAULT false,
  is_carry_forward_allowed       boolean NOT NULL DEFAULT false,
  max_carry_forward_days         integer NOT NULL DEFAULT 0,
  requires_attachment            boolean NOT NULL DEFAULT false,
  attachment_required_after_days integer NOT NULL DEFAULT 0,
  gender_restriction             public.gender_restriction_enum NOT NULL DEFAULT 'None',
  is_paid                        boolean NOT NULL DEFAULT true,
  is_active                      boolean NOT NULL DEFAULT true
);

-- public_holidays (NULL department_id = global holiday)
CREATE TABLE public.public_holidays (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date          date NOT NULL,
  name          text NOT NULL,
  department_id uuid REFERENCES public.departments(id) ON DELETE CASCADE
);

-- system_settings (single-row table)
CREATE TABLE public.system_settings (
  id                           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  approval_sla_days            integer NOT NULL DEFAULT 5,
  backdated_leave_window_days  integer NOT NULL DEFAULT 7,
  carry_forward_expiry_month   integer NOT NULL DEFAULT 3,
  encashment_enabled           boolean NOT NULL DEFAULT false,
  leave_year_start_month       integer NOT NULL DEFAULT 1
);

-- leave_balances — unique per (user, leave_type, year)
CREATE TABLE public.leave_balances (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                 uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  leave_type_id           uuid NOT NULL REFERENCES public.leave_type_configs(id) ON DELETE CASCADE,
  year                    integer NOT NULL,
  allocated               decimal(6,2) NOT NULL DEFAULT 0,
  used                    decimal(6,2) NOT NULL DEFAULT 0,
  carried_forward         decimal(6,2) NOT NULL DEFAULT 0,
  carried_forward_expiry  date,
  encashed                decimal(6,2) NOT NULL DEFAULT 0,
  CONSTRAINT leave_balances_unique_user_type_year UNIQUE (user_id, leave_type_id, year)
);

-- leave_requests
CREATE TABLE public.leave_requests (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  leave_type_id        uuid NOT NULL REFERENCES public.leave_type_configs(id) ON DELETE RESTRICT,
  start_date           date NOT NULL,
  end_date             date NOT NULL,
  duration_days        decimal(6,2) NOT NULL,
  duration_modifier    public.duration_modifier_enum NOT NULL DEFAULT 'Full',
  reason               text,
  status               public.leave_status NOT NULL DEFAULT 'Pending',
  approver_id          uuid REFERENCES public.users(id) ON DELETE SET NULL,
  approver_comment     text,
  attachment_url       text,
  covering_employee_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  delegate_approver_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  is_backdated         boolean NOT NULL DEFAULT false,
  is_cross_year        boolean NOT NULL DEFAULT false,
  escalated_at         timestamptz,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now()
);

-- notifications
CREATE TABLE public.notifications (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  type               public.notification_type_enum NOT NULL,
  title              text NOT NULL,
  body               text NOT NULL,
  related_request_id uuid REFERENCES public.leave_requests(id) ON DELETE SET NULL,
  is_read            boolean NOT NULL DEFAULT false,
  created_at         timestamptz NOT NULL DEFAULT now()
);

-- audit_log (actor_id nullable: preserves log history if actor is later deleted)
CREATE TABLE public.audit_log (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id     uuid REFERENCES public.users(id) ON DELETE SET NULL,
  action       text NOT NULL,
  target_table text NOT NULL,
  target_id    uuid NOT NULL,
  before_state jsonb,
  after_state  jsonb,
  reason       text,
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- leave_encashment_log
CREATE TABLE public.leave_encashment_log (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  leave_type_id uuid NOT NULL REFERENCES public.leave_type_configs(id) ON DELETE RESTRICT,
  year          integer NOT NULL,
  days_encashed decimal(6,2) NOT NULL,
  triggered_by  public.encashment_trigger_enum NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- =================================================================
-- 1.3 INDEXES
-- =================================================================

-- UNIQUE constraint on leave_balances already creates the composite index.
-- Additional performance indexes:
CREATE INDEX idx_leave_requests_user_id     ON public.leave_requests (user_id);
CREATE INDEX idx_leave_requests_approver_id ON public.leave_requests (approver_id);
CREATE INDEX idx_leave_requests_status      ON public.leave_requests (status);
CREATE INDEX idx_leave_requests_dates       ON public.leave_requests (start_date, end_date);
CREATE INDEX idx_leave_requests_created_at  ON public.leave_requests (created_at DESC);
CREATE INDEX idx_leave_balances_user_id     ON public.leave_balances (user_id);
CREATE INDEX idx_notifications_user_id      ON public.notifications (user_id);
CREATE INDEX idx_notifications_unread       ON public.notifications (user_id, is_read);
CREATE INDEX idx_audit_log_actor_id         ON public.audit_log (actor_id);
CREATE INDEX idx_audit_log_created_at       ON public.audit_log (created_at DESC);
CREATE INDEX idx_public_holidays_date       ON public.public_holidays (date);

-- =================================================================
-- 1.4 HELPER FUNCTIONS FOR RLS
-- SECURITY DEFINER avoids infinite recursion when policies query public.users
-- =================================================================

CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS public.user_role
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT role FROM public.users WHERE id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION public.get_user_department_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT department_id FROM public.users WHERE id = auth.uid()
$$;

-- =================================================================
-- 1.5 ENABLE ROW LEVEL SECURITY
-- =================================================================

ALTER TABLE public.departments          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_type_configs   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.public_holidays      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_balances       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_requests       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_encashment_log ENABLE ROW LEVEL SECURITY;

-- =================================================================
-- 1.6 RLS POLICIES
-- =================================================================

-- ── departments ───────────────────────────────────────────────────
CREATE POLICY "departments: all authenticated can read"
  ON public.departments FOR SELECT TO authenticated USING (true);

CREATE POLICY "departments: admin insert"
  ON public.departments FOR INSERT TO authenticated
  WITH CHECK (public.get_user_role() = 'Admin');

CREATE POLICY "departments: admin update"
  ON public.departments FOR UPDATE TO authenticated
  USING (public.get_user_role() = 'Admin');

-- ── users ─────────────────────────────────────────────────────────
CREATE POLICY "users: read own row"
  ON public.users FOR SELECT TO authenticated
  USING (id = auth.uid());

CREATE POLICY "users: read same department colleagues"
  ON public.users FOR SELECT TO authenticated
  USING (
    department_id IS NOT NULL
    AND department_id = public.get_user_department_id()
  );

CREATE POLICY "users: admin read all"
  ON public.users FOR SELECT TO authenticated
  USING (public.get_user_role() = 'Admin');

CREATE POLICY "users: admin insert"
  ON public.users FOR INSERT TO authenticated
  WITH CHECK (public.get_user_role() = 'Admin');

CREATE POLICY "users: admin update all"
  ON public.users FOR UPDATE TO authenticated
  USING (public.get_user_role() = 'Admin');

CREATE POLICY "users: update own profile"
  ON public.users FOR UPDATE TO authenticated
  USING (id = auth.uid());

-- ── leave_type_configs ────────────────────────────────────────────
CREATE POLICY "leave_type_configs: all authenticated can read"
  ON public.leave_type_configs FOR SELECT TO authenticated USING (true);

CREATE POLICY "leave_type_configs: admin insert"
  ON public.leave_type_configs FOR INSERT TO authenticated
  WITH CHECK (public.get_user_role() = 'Admin');

CREATE POLICY "leave_type_configs: admin update"
  ON public.leave_type_configs FOR UPDATE TO authenticated
  USING (public.get_user_role() = 'Admin');

CREATE POLICY "leave_type_configs: admin delete"
  ON public.leave_type_configs FOR DELETE TO authenticated
  USING (public.get_user_role() = 'Admin');

-- ── public_holidays ───────────────────────────────────────────────
CREATE POLICY "public_holidays: all authenticated can read"
  ON public.public_holidays FOR SELECT TO authenticated USING (true);

CREATE POLICY "public_holidays: admin insert"
  ON public.public_holidays FOR INSERT TO authenticated
  WITH CHECK (public.get_user_role() = 'Admin');

CREATE POLICY "public_holidays: admin update"
  ON public.public_holidays FOR UPDATE TO authenticated
  USING (public.get_user_role() = 'Admin');

CREATE POLICY "public_holidays: admin delete"
  ON public.public_holidays FOR DELETE TO authenticated
  USING (public.get_user_role() = 'Admin');

-- ── system_settings ───────────────────────────────────────────────
CREATE POLICY "system_settings: all authenticated can read"
  ON public.system_settings FOR SELECT TO authenticated USING (true);

CREATE POLICY "system_settings: admin update"
  ON public.system_settings FOR UPDATE TO authenticated
  USING (public.get_user_role() = 'Admin');

-- ── leave_balances ────────────────────────────────────────────────
CREATE POLICY "leave_balances: read own"
  ON public.leave_balances FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "leave_balances: manager reads department"
  ON public.leave_balances FOR SELECT TO authenticated
  USING (
    public.get_user_role() = 'Manager'
    AND user_id IN (
      SELECT id FROM public.users
      WHERE department_id = public.get_user_department_id()
    )
  );

CREATE POLICY "leave_balances: admin read all"
  ON public.leave_balances FOR SELECT TO authenticated
  USING (public.get_user_role() = 'Admin');

CREATE POLICY "leave_balances: admin update"
  ON public.leave_balances FOR UPDATE TO authenticated
  USING (public.get_user_role() = 'Admin');

-- ── leave_requests ────────────────────────────────────────────────
CREATE POLICY "leave_requests: read own"
  ON public.leave_requests FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "leave_requests: insert own"
  ON public.leave_requests FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "leave_requests: update own pending or approved"
  ON public.leave_requests FOR UPDATE TO authenticated
  USING  (user_id = auth.uid() AND status IN ('Pending', 'Approved'))
  WITH CHECK (user_id = auth.uid() AND status = 'Cancelled');

CREATE POLICY "leave_requests: manager reads department"
  ON public.leave_requests FOR SELECT TO authenticated
  USING (
    public.get_user_role() = 'Manager'
    AND user_id IN (
      SELECT id FROM public.users
      WHERE department_id = public.get_user_department_id()
    )
  );

CREATE POLICY "leave_requests: manager updates department"
  ON public.leave_requests FOR UPDATE TO authenticated
  USING (
    public.get_user_role() = 'Manager'
    AND user_id IN (
      SELECT id FROM public.users
      WHERE department_id = public.get_user_department_id()
    )
  );

CREATE POLICY "leave_requests: admin read all"
  ON public.leave_requests FOR SELECT TO authenticated
  USING (public.get_user_role() = 'Admin');

CREATE POLICY "leave_requests: admin update all"
  ON public.leave_requests FOR UPDATE TO authenticated
  USING (public.get_user_role() = 'Admin');

CREATE POLICY "leave_requests: admin delete"
  ON public.leave_requests FOR DELETE TO authenticated
  USING (public.get_user_role() = 'Admin');

-- ── notifications ─────────────────────────────────────────────────
CREATE POLICY "notifications: read own"
  ON public.notifications FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "notifications: update own (mark read)"
  ON public.notifications FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

-- ── audit_log ─────────────────────────────────────────────────────
-- Admin SELECT only; INSERT via service role client only (bypasses RLS)
CREATE POLICY "audit_log: admin read"
  ON public.audit_log FOR SELECT TO authenticated
  USING (public.get_user_role() = 'Admin');

-- ── leave_encashment_log ──────────────────────────────────────────
CREATE POLICY "leave_encashment_log: read own"
  ON public.leave_encashment_log FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "leave_encashment_log: admin read all"
  ON public.leave_encashment_log FOR SELECT TO authenticated
  USING (public.get_user_role() = 'Admin');

-- =================================================================
-- 1.7 SEED DATA
-- =================================================================

-- Default leave types
INSERT INTO public.leave_type_configs
  (name, default_quota, allow_half_day, is_carry_forward_allowed, max_carry_forward_days,
   requires_attachment, attachment_required_after_days, gender_restriction, is_paid, is_active)
VALUES
  ('Annual Leave',        16,  true,  true,  5,  false, 0, 'None',   true,  true),
  ('Sick Leave',          14,  false, false, 0,  true,  1, 'None',   true,  true),
  ('Unpaid Leave',        30,  false, false, 0,  false, 0, 'None',   false, true),
  ('Compassionate Leave',  3,  false, false, 0,  false, 0, 'None',   true,  true),
  ('Maternity Leave',     60,  false, false, 0,  false, 0, 'Female', true,  true),
  ('Paternity Leave',      7,  false, false, 0,  false, 0, 'Male',   true,  true),
  ('Marriage Leave',       3,  false, false, 0,  false, 0, 'None',   true,  true),
  ('Hajj Leave',          10,  false, false, 0,  false, 0, 'None',   true,  true);

-- Default system settings (enforced as single row; app prevents inserting more)
INSERT INTO public.system_settings
  (approval_sla_days, backdated_leave_window_days, carry_forward_expiry_month,
   encashment_enabled, leave_year_start_month)
VALUES (5, 7, 3, false, 1);
