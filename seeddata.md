# Seed Data

## Departments

| ID | Name | Manager |
|----|------|---------|
| `d1000000-0000-0000-0000-000000000001` | Engineering | Razif Hamdan |
| `d1000000-0000-0000-0000-000000000002` | Human Resources | Farid Yusof |

---

## Users

| ID | Email | Password | Full Name | Role | Department | Join Date |
|----|-------|----------|-----------|------|------------|-----------|
| `a1000000-0000-0000-0000-000000000001` | admin@leavesystem.com | `Admin1234!` | Ali Hassan | Admin | Engineering | 2020-01-01 |
| `a1000000-0000-0000-0000-000000000002` | manager@leavesystem.com | `Manager1234!` | Razif Hamdan | Manager | Engineering | 2021-03-15 |
| `a1000000-0000-0000-0000-000000000003` | employee1@leavesystem.com | `Employee1234!` | Ahmad Faris | Employee | Engineering | 2022-06-01 |
| `a1000000-0000-0000-0000-000000000004` | employee2@leavesystem.com | `Employee1234!` | Hafiz Azman | Employee | Engineering | 2023-09-10 |
| `a1000000-0000-0000-0000-000000000005` | hrmanager@leavesystem.com | `Manager1234!` | Farid Yusof | Manager | Human Resources | 2020-07-20 |

---

## Leave Balances (Year: 2026)

All users received the following balances:

| Leave Type | Allocated | Carried Forward | Used |
|------------|-----------|-----------------|------|
| Annual Leave | 16 | 2 | 0 |
| Sick Leave | 14 | 0 | 0 |

**Effective Annual Leave balance = 18 days (16 allocated + 2 carried forward)**

---

## Leave Types (from migration)

| Name | Quota | Half-Day | Carry Forward | Max CF Days | Requires Attachment | Paid | Gender |
|------|-------|----------|---------------|-------------|---------------------|------|--------|
| Annual Leave | 16 | Yes | Yes | 5 | No | Yes | None |
| Sick Leave | 14 | No | No | 0 | Yes (after 1 day) | Yes | None |
| Unpaid Leave | 30 | No | No | 0 | No | No | None |
| Compassionate Leave | 3 | No | No | 0 | No | Yes | None |
| Maternity Leave | 60 | No | No | 0 | No | Yes | Female |
| Paternity Leave | 7 | No | No | 0 | No | Yes | Male |
| Marriage Leave | 3 | No | No | 0 | No | Yes | None |
| Hajj Leave | 10 | No | No | 0 | No | Yes | None |

---

## System Settings

| Setting | Value |
|---------|-------|
| Approval SLA Days | 5 |
| Backdated Leave Window | 7 days |
| Carry Forward Expiry Month | March (3) |
| Encashment Enabled | false |
| Leave Year Start Month | January (1) |
