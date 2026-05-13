# Continuum Flows List

## Authentication & Onboarding
- **Login (Employee/Manager/HR/Admin)**: Functional (Custom JWT).
- **Super Admin Login**: Functional (Custom JWT).
- **Sign-up / Accept Invite**: Functional (Validates token, sets up password).
- **Company Onboarding**: Functional (Creating new company, setup).
- **Forgot Password / Password Reset**: **BROKEN** (Currently relies on removed Supabase Auth, needs to be re-implemented).

## Attendance
- **Mark Attendance (Check in/out)**: Functional.
- **View Own Attendance**: Functional.
- **View Team Attendance (Manager)**: Functional.
- **View All Attendance (HR/Admin)**: Functional.
- **Regularize Attendance**: Functional (Request -> Approval/Rejection).
- **Override Attendance (HR)**: Functional.

## Leave Management
- **Apply Leave (Request)**: Functional.
- **View Own Leave Balances & History**: Functional.
- **View Team Leaves (Manager)**: Functional.
- **Approve/Reject Leave (Manager/HR)**: Functional.
- **Bulk Approve Leave (Manager/HR)**: Functional.
- **Cancel Approved Leave (HR/Manager)**: Functional.
- **Encash Leave**: Functional.
- **Adjust Leave Balance (HR)**: Functional.
- **Cron: Leave Accrual & Year-End Carry Forward**: Functional.

## Payroll
- **Generate Payroll (HR)**: Functional.
- **Approve Payroll (HR/Admin)**: Functional.
- **Process Payroll Payments (HR/Admin)**: Functional.
- **View Own Payslip (Employee)**: Functional.
- **View All Payroll Data (HR/Admin)**: Functional.

## Employee Lifecycle
- **Invite Employee (HR)**: Functional.
- **View Own Profile**: Functional.
- **Edit Any Profile (HR)**: Functional.
- **Terminate/Exit Checklist (HR)**: Functional.
- **Employee Movements (Promotions/Transfers)**: Functional.

## Company & Settings
- **View/Edit Company Settings (HR/Admin)**: Functional.
- **Manage Roles & Permissions (Admin)**: Functional.
- **Manage Leave Policies (HR)**: Functional.
- **Manage Notification Templates (HR)**: Functional.

## Reports & Audit
- **View/Export Team Reports (Manager)**: Functional.
- **View/Export All Reports (HR/Admin)**: Functional.
- **View Own Audit Trail**: Functional.
- **View/Export All Audit Logs (HR/Admin)**: Functional.
- **Cron: SLA Checks**: Functional.

## Reimbursements
- **Submit Reimbursement**: Functional.
- **Approve/Reject Reimbursement**: Functional.

## Notifications
- **View Notifications**: Functional.
- **Mark Read**: Functional.
- **Configure Notification Preferences**: Functional.
