# 📘 CONTINUUM — Complete Product Manual
> Written in plain English for product managers and non-technical team members.
> Last updated: 2026-06-29

---

## What Is Continuum?

Continuum is an all-in-one HR management platform for companies. It lets HR teams manage employees, run payroll, track attendance, handle leave requests, recruit new hires, run performance reviews, and much more — all from one place.

Think of it as the operating system for your HR department.

---

## Who Uses It? (The Four Roles)

The app has four completely separate sections, one for each type of user:

| Role | Who It's For | URL Section |
|------|-------------|-------------|
| **Admin** | Company owner / IT administrator | `/admin/...` |
| **HR** | HR managers and HR team | `/hr/...` |
| **Manager** | Team leads / department managers | `/manager/...` |
| **Employee** | Everyone else on the team | `/employee/...` |

Each role only sees their own section. An employee cannot visit HR pages, and a manager cannot see billing.

---

## How to Log In

### Sign-In Page (`/sign-in`)
**What it does:** The main login screen for the entire application.

**What you see:**
- Email address field
- Password field
- "Sign In" button
- "Forgot your password?" link
- "Don't have an account? Sign up" link

**What each button does:**
- **Sign In** — Verifies your email and password. If correct, takes you to your role-specific dashboard (HR goes to `/hr/dashboard`, employees go to `/employee/dashboard`, etc.). If wrong, shows an error message.
- **Forgot your password?** — Takes you to the password reset page.
- **Sign up** — Takes you to the account creation page.

---

### Sign-Up Page (`/sign-up`)
**What it does:** Creates a brand new company account in Continuum. This is only used the very first time a company joins — not for adding new employees (that's done by HR from inside the app).

**What you fill in:**
- Your name
- Company name
- Work email address
- Password

**What the button does:**
- **Create Account** — Registers the company and sends a verification email. After verifying, takes you to the Onboarding wizard to set up your company.

---

### Forgot Password Page (`/forgot-password`)
**What it does:** Sends a password reset link to your email.

**What you fill in:**
- Your email address

**What the button does:**
- **Send Reset Link** — Emails you a secure link that's valid for a limited time. Click that link in your email to set a new password.

---

### Reset Password Page (`/reset-password`)
**What it does:** The page you land on after clicking the reset link in your email. Lets you set a new password.

**What the button does:**
- **Reset Password** — Saves your new password and logs you in automatically.

---

## 🚀 Onboarding — First-Time Company Setup (`/onboarding`)

**What it does:** A step-by-step wizard that walks a new company through setting up Continuum for the first time. You only go through this once, right after signing up.

**The steps are:**
1. **Company Profile** — Enter your company name, industry, country, and timezone.
2. **Team Size** — Tell Continuum how many employees you have.
3. **Leave Policy** — Set up how many paid leave days, sick days, and casual leave days your company gives employees per year.
4. **Payroll Settings** — Set your pay cycle (monthly, bi-weekly), currency, and tax settings.
5. **Invite HR Admin** — Add your HR manager's email so they can start using the system.
6. **Done** — Takes you to the admin dashboard.

**Buttons on this page:**
- **Next** — Moves to the next setup step. Validates that you've filled in the required fields first.
- **Back** — Goes back to the previous step. Your progress is saved.
- **Skip** (on some steps) — Skips optional steps. You can always set them up later from Settings.
- **Finish Setup** — Completes the onboarding and opens the Admin dashboard.

---

# 🔧 ADMIN PORTAL

The Admin portal is for the company owner or IT administrator. It handles company-wide settings, billing, and top-level configuration. Most day-to-day HR work happens in the HR portal, not here.

---

## Admin Pages

### Admin Dashboard (`/admin/dashboard`)
**What it does:** A high-level overview of the company's status. Shows key numbers at a glance — total employees, active payroll, plan status, recent activity.

**Buttons:**
- **Go to HR Portal** — Opens the HR section for managing employees.
- **Manage Billing** — Opens the billing page.
- **Company Settings** — Opens settings.

---

### Getting Started (`/admin/getting-started`)
**What it does:** A checklist of setup tasks the admin needs to complete to fully configure Continuum. Each item shows whether it's done or still pending. Think of it as your onboarding progress tracker that you can come back to anytime.

**Items on the checklist include:**
- Complete company profile ✅/⬜
- Add first employee ✅/⬜
- Set up payroll ✅/⬜
- Configure leave policy ✅/⬜
- Set up WhatsApp integration ✅/⬜ *(optional)*

**Buttons:**
- Each checklist item has a **Go →** button that takes you directly to the relevant setup page.

---

### Billing (`/admin/billing`)
**What it does:** Manages your Continuum subscription — which plan you're on, how many seats you're paying for, payment history, and invoices.

**What you see:**
- Current plan (Free / Starter / Growth / Enterprise)
- Number of seats used vs. purchased
- Next billing date
- Recent invoices

**Buttons:**
- **Upgrade Plan** — Opens a plan selection screen to move to a higher tier.
- **Download Invoice** — Downloads a PDF invoice for any past payment.
- **Manage Payment Method** — Updates your credit card or payment details.
- **Cancel Subscription** — Begins the cancellation process (asks for confirmation).

---

### Company Settings (`/admin/company-settings`)
**What it does:** The master settings page for your entire company. Everything that applies company-wide is set here.

**Sections include:**
- **General** — Company name, logo, website, industry, country, timezone.
- **Branding** — Upload your company logo that appears throughout the app.
- **Locale** — Currency, date format, language.
- **Security** — Password policy, session timeout, two-factor authentication requirements.

**Buttons:**
- **Save Changes** — Saves whatever section you just edited.
- **Upload Logo** — Opens a file picker to choose your company logo image.
- **Reset to Defaults** — Resets that section back to default values (asks for confirmation).

---

### WhatsApp Integration (`/admin/whatsapp-integration`)
**What it does:** Connects your company's WhatsApp Business Account so that HR notifications, leave approvals, and payslips can be sent directly to employees via WhatsApp. This is a 3-step process.

**Step 1 — Register with Meta:**
- **Open Meta Business Manager** — Opens Facebook/Meta's business portal in a new browser tab where you complete the official WhatsApp Business Account registration. After registering there, come back here.

**Step 2 — Test your webhook:**
- **Test Webhook** — Sends a test ping to your webhook URL (`/api/webhooks/whatsapp`) to confirm it's reachable. Shows a green ✅ if it works, red ❌ if not.

**Step 3 — Environment variables:**
- The page lists the 4 settings you need to add to your hosting environment (`WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_WABA_ID`, `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_VERIFY_TOKEN`). No button — this is instructional.

**Other buttons:**
- **← Back to Getting Started** — Returns to the admin checklist.

---

### Super Admin Panel (`/super-admin/dashboard`)
**What it does:** A special internal-only page for the Continuum platform team (not for regular company admins). It shows all companies using the platform, usage statistics, and allows platform-level configuration.

> ⚠️ Regular users never see this page. It's only accessible to the Continuum engineering/ops team.

---

# 👥 HR PORTAL

The HR portal is the main working area for HR managers. It's the largest section of the app and covers everything from hiring to payroll to performance reviews.

---

## HR Dashboard (`/hr/dashboard`)
**What it does:** The HR team's home base. Shows a real-time snapshot of the whole company — headcount, today's attendance, pending leave requests, upcoming birthdays, new joiners this month, and any items needing HR attention.

**What you see:**
- **Headcount card** — Total active employees
- **Attendance today** — How many people are in, remote, absent, or on leave right now
- **Pending approvals** — Leave requests or expenses waiting for sign-off
- **Recent activity** — A live feed of recent HR events (new hire joined, someone submitted leave, etc.)
- **Upcoming** — Birthdays, anniversaries, and probation end dates in the next 30 days

**Buttons:**
- **View All Employees** — Goes to the employee list
- **View Pending Approvals** — Goes to the approvals queue
- **Export Report** — Downloads a summary of the dashboard data as a spreadsheet

---

## Employees (`/hr/employees`)
**What it does:** The master list of every employee in the company. This is where HR adds new employees, searches for people, and clicks into individual employee profiles to view or edit their information.

**What you see:**
- A searchable, filterable table of all employees
- Columns: Name, Department, Job Title, Employment Type, Status (Active / On Leave / Inactive), Start Date

**Filters available:**
- Search by name or email
- Filter by department
- Filter by status (Active, Inactive, On Probation)
- Filter by employment type (Full-time, Part-time, Contract)

**Buttons:**
- **Invite Employee** — Opens a form to invite a new employee by email. They'll receive an email with a link to set up their account.
- **Bulk Import** — Goes to the bulk import page to add many employees at once via a spreadsheet.
- **Export** — Downloads the current filtered employee list as a CSV file.
- **[Employee Name]** — Clicking any row opens that employee's full profile page.
- **Filter / Sort** — Opens filter dropdowns to narrow the list.

---

## Invite Employee (`/hr/employees/invite`)
**What it does:** A form to manually add a new employee one at a time. Fill in their details and send them an invitation email so they can log in and complete their profile.

**What you fill in:**
- First and last name
- Work email address
- Department
- Job title
- Employment type (Full-time, Part-time, Contract, Intern)
- Start date
- Manager (who they report to)

**Buttons:**
- **Send Invite** — Creates the employee record and emails them an invitation link. They use that link to set their password and log in for the first time.
- **Cancel** — Goes back to the employee list without creating anyone.

---

## Bulk Import (`/hr/bulk-import`)
**What it does:** Lets HR add many employees at once by uploading a spreadsheet, instead of inviting them one by one. Useful when a company is first setting up Continuum or after an acquisition.

**How it works:**
1. Download the template CSV file
2. Fill it in with employee data (name, email, department, etc.)
3. Upload the completed file
4. Preview the data and fix any errors
5. Confirm the import

**Buttons:**
- **Download Template** — Downloads a blank CSV file with the correct column headers already filled in.
- **Upload File** — Opens a file picker to select your filled-in CSV.
- **Preview Import** — Shows you exactly what will be created, with any errors highlighted in red.
- **Confirm Import** — Creates all the employee accounts and sends invitation emails.
- **Cancel** — Cancels and goes back.

---

## Attendance (`/hr/attendance`)
**What it does:** Shows the day's attendance record for every employee — who checked in, when they checked in and out, how many hours they worked, and their status (Present, Late, Absent, Work From Home, Half Day, On Leave).

**What you see:**
- A date picker to choose which day to view
- Summary cards: Total employees, Present, Late, Absent, WFH, On Leave, Half Day
- A table of every employee with their check-in time, check-out time, total hours, and status
- A search box to find a specific employee
- A status filter to show only Absent employees, for example

**Tabs:**
- **Daily View** — The default view showing one day at a time
- **Regularization Requests** — Employees who forgot to clock in and are requesting HR to manually fix their attendance for a specific day

**Buttons:**
- **Export CSV** — Downloads the current day's attendance data as a spreadsheet file named `attendance-[date].csv`. The file includes employee name, department, check-in/out times, total hours, status, and whether they worked from office or home.
- **Approve** (on regularization requests) — Approves an employee's request to fix their attendance record.
- **Reject** (on regularization requests) — Rejects the request and optionally adds a note explaining why.

---

## My Attendance (`/hr/my-attendance`)
**What it does:** The HR team member's personal attendance record — their own check-ins, check-outs, and leave history. Same layout as the employee attendance page but only shows the logged-in HR person's data.

**Buttons:**
- **Clock In** — Records the current time as the start of the work day.
- **Clock Out** — Records the current time as the end of the work day.
- **Request Regularization** — Submits a request to fix an incorrect attendance entry for a past day.

---

## Leave Requests (`/hr/leave-requests`)
**What it does:** The queue of all pending, approved, and rejected leave requests across the entire company. HR can see every request and approve or reject them from this single page.

**What you see:**
- Filter tabs: All / Pending / Approved / Rejected
- Each request shows: Employee name, leave type (Annual, Sick, Casual, etc.), start date, end date, number of days, and reason
- Current leave balance for that employee

**Buttons:**
- **Approve** — Approves the leave request. The employee gets notified automatically.
- **Reject** — Rejects the request. A text box appears to type the reason (optional but recommended).
- **View Profile** — Opens that employee's full profile.
- **Filter by Department / Leave Type / Date Range** — Narrows the list.
- **Export** — Downloads the list as a spreadsheet.

---

## Leave Balance (`/hr/leave-balance`)
**What it does:** Shows every employee's current leave balance — how many days of Annual Leave, Sick Leave, Casual Leave, etc. they have remaining for the year.

**What you see:**
- A table with one row per employee
- Columns for each leave type showing: Entitled / Used / Remaining

**Buttons:**
- **Adjust Balance** — Manually adds or subtracts days from a specific employee's leave balance (used for corrections or carry-forward adjustments).
- **Export** — Downloads the entire leave balance sheet.
- **Reset Annual Leave** — Resets all annual leave balances at the start of a new leave year (asks for confirmation before doing this).

---

## Leave Calendar (`/hr/leave-calendar`)
**What it does:** A visual month-by-month calendar showing when employees are on leave. Helps managers and HR plan around absences and spot when too many people are off at the same time.

**What you see:**
- A calendar grid showing approved leaves colour-coded by employee or department
- Each leave block shows the employee's name and leave type

**Buttons:**
- **Previous Month / Next Month** — Navigates the calendar.
- **Filter by Department** — Shows only one department's leaves.
- **Today** — Jumps back to the current month.
- **Export** — Downloads the calendar data.

---

## Leave Quotas (`/hr/leave-quotas`)
**What it does:** Defines how many days of each leave type every employee is entitled to per year. For example, "All full-time employees get 18 days Annual Leave and 7 days Sick Leave."

**What you set:**
- Leave type name (Annual, Sick, Casual, Maternity, Paternity, etc.)
- Days entitled per year
- Whether unused days carry over to the next year
- Which employee types it applies to

**Buttons:**
- **Add Leave Type** — Creates a new category of leave.
- **Edit** — Changes the quota for an existing leave type.
- **Delete** — Removes a leave type (asks for confirmation).
- **Save** — Saves your changes.

---

## Leave Encashment (`/hr/leave-encashment`)
**What it does:** Manages the process of paying employees for unused leave days that they want to "cash out" instead of taking as time off. HR can view requests and process payments.

**Buttons:**
- **Approve** — Approves the encashment request and adds it to the next payroll run.
- **Reject** — Rejects the request.
- **Export** — Downloads all encashment records.

---

## Payroll (`/hr/payroll`)
**What it does:** The payroll processing page. This is where HR runs the monthly payroll — calculating salaries, deductions, taxes, and generating payslips for every employee.

**How payroll works in Continuum:**
1. HR reviews the payroll summary for the month
2. HR verifies attendance, leaves, and any adjustments
3. HR clicks "Run Payroll" to calculate everything
4. HR reviews the calculated payslips
5. HR approves and finalises — employees can then view their payslips

**What you see:**
- The current payroll period (e.g., "June 2026")
- Status: Draft / Processing / Approved / Paid
- A table of every employee with their: Gross Salary, Deductions, Net Pay
- Summary totals at the bottom

**Buttons:**
- **Run Payroll** — Calculates salaries for the current period based on attendance, leaves, and salary structures. This creates a draft.
- **Edit Entry** — Manually adjusts an individual employee's payroll entry for this month (for bonuses, deductions, corrections).
- **Approve Payroll** — Locks the payroll and finalises it. Employees can now see their payslips.
- **Export Payroll Sheet** — Downloads the full payroll as a spreadsheet for your bank or accounting software.
- **Previous Period / Next Period** — Navigates between months.

---

## Payslips (`/hr/payslips`)
**What it does:** A view of all generated payslips across all employees and all months. HR can search for any payslip and download or resend it to an employee.

**Buttons:**
- **Download** — Downloads a specific payslip as a PDF.
- **Resend to Employee** — Emails the payslip PDF to the employee again.
- **Filter by Month / Employee** — Narrows the list.

---

## Payroll Advances (`/hr/payroll-advances`)
**What it does:** Manages salary advance requests — when an employee asks to receive part of their next month's salary early. HR can approve or reject these requests and track repayment.

**Buttons:**
- **Approve** — Approves the advance. The amount is recorded and will be automatically deducted from the employee's next payslip.
- **Reject** — Rejects the request with an optional reason.
- **Mark as Repaid** — Records that an employee has repaid an advance outside of payroll.

---

## Salary Components (`/hr/salary-components`)
**What it does:** Defines the building blocks of a salary — what goes into "Gross Pay." For example: Basic Pay, House Rent Allowance (HRA), Travel Allowance, Medical Allowance, Performance Bonus.

**What you set per component:**
- Name (e.g., "HRA")
- Type (Earning or Deduction)
- Whether it's taxable
- Whether it's a fixed amount or a percentage of basic pay

**Buttons:**
- **Add Component** — Creates a new salary component.
- **Edit** — Changes an existing component.
- **Delete** — Removes a component (only if no salary structure is using it).
- **Save** — Saves changes.

---

## Salary Structures (`/hr/salary-structures`)
**What it does:** Combines salary components into a complete package. For example, "Senior Engineer Structure = Basic + HRA + Travel Allowance + PF Deduction." You then assign a structure to each employee.

**What you set per structure:**
- Name (e.g., "Standard Full-Time")
- Which components are included
- The percentage or fixed amount for each component

**Buttons:**
- **Create Structure** — Builds a new salary structure.
- **Clone** — Duplicates an existing structure as a starting point.
- **Edit** — Modifies an existing structure.
- **Delete** — Removes a structure.
- **Assign to Employee** — Assigns this structure to specific employees.

---

## Recruitment (`/hr/recruitment`)
**What it does:** The hiring pipeline. Shows all open positions, candidate applications, and where each candidate is in the interview process.

**What you see:**
- A list of all active job postings
- For each posting: number of applicants, stage breakdown (Applied → Screening → Interview → Offer → Hired)
- A Kanban board view showing individual candidates moving through stages

**Buttons:**
- **Post New Job** — Opens a form to create a new job posting.
- **View Applications** — Opens the list of candidates for a specific job.
- **Move to Next Stage** — Advances a candidate (e.g., from "Screening" to "Interview").
- **Reject Candidate** — Marks a candidate as rejected and optionally sends them a rejection email.
- **Send Offer Letter** — Generates and emails an offer letter to a candidate.
- **Mark as Hired** — Converts the candidate into a new employee in the system.
- **Archive Job** — Closes a job posting and removes it from the public job board.

---

## Job Board (`/hr/job-board`)
**What it does:** The internal job board — a publicly visible (within the company) list of open positions that current employees can browse and apply to. This is the employee-facing view of the same job postings HR creates in Recruitment.

**What you see:**
- Cards for each open position showing: Job title, Department, Location, Experience required, Salary range, Employment type, Required skills, Posted date

**Filters:**
- Search by keyword
- Filter by department

**Buttons (per job card):**
- **Apply Now** — Submits an application for that job. The button changes to "Applying..." while processing, then shows "✅ Applied" once done. If you've already applied, it tells you so instead of letting you apply twice.

---

## Performance / Reviews (`/hr/performance`)
**What it does:** Manages the company's performance review cycles. HR creates review periods (e.g., "Q4 2026 Annual Review"), defines who reviews whom, and monitors completion progress.

**What you see:**
- Active review cycles with their status (Not Started / In Progress / Completed)
- Completion percentage for each cycle
- A breakdown of who has submitted reviews and who hasn't

**Buttons:**
- **Create Review Cycle** — Sets up a new performance review period with start/end dates.
- **Send Reminders** — Emails all employees who haven't yet completed their reviews.
- **View Results** — Opens the aggregated scores and written feedback for a completed cycle.
- **Close Cycle** — Ends the review period and locks all submissions.
- **Export Results** — Downloads all review scores and comments as a spreadsheet.

---

## Goals (`/hr/goals`)
**What it does:** Tracks employee and team OKRs (Objectives and Key Results) or personal goals. HR can see goal progress across the entire company.

**What you see:**
- Goals organised by employee, team, or company level
- Each goal shows: Title, owner, deadline, progress percentage, status (On Track / At Risk / Completed)

**Buttons:**
- **Add Goal** — Creates a new goal for an employee, team, or the whole company.
- **Edit** — Changes the goal details or updates progress.
- **Mark Complete** — Closes out a finished goal.
- **Delete** — Removes a goal.

---

## Shifts (`/hr/shifts`)
**What it does:** Manages employee work shifts — for companies where different employees work at different times (e.g., morning shift 9am–5pm, evening shift 2pm–10pm). HR defines the shifts and assigns them to employees.

**Buttons:**
- **Create Shift** — Defines a new shift with a name, start time, end time, and days of the week.
- **Assign Shift** — Assigns a shift to one or more employees.
- **Edit** — Changes a shift's times.
- **Delete** — Removes a shift.

---

## Holidays (`/hr/holidays`)
**What it does:** The company's official holiday calendar. Defines which days are public/national holidays so that the leave and attendance systems know not to count those days.

**Buttons:**
- **Add Holiday** — Adds a new holiday with a date and name (e.g., "Republic Day - Jan 26").
- **Import National Holidays** — Bulk-imports official public holidays for a selected country and year.
- **Edit** — Changes a holiday's date or name.
- **Delete** — Removes a holiday from the calendar.
- **Export** — Downloads the holiday list.

---

## Reports (`/hr/reports`)
**What it does:** Pre-built HR reports that can be generated and downloaded instantly. Covers all major HR topics.

**Available reports include:**
- Headcount Report — Total employees by department, location, employment type
- Attrition Report — Employees who left and why
- Attendance Summary — Attendance statistics for any date range
- Leave Utilisation — How much leave is being taken and by whom
- Payroll Summary — Monthly payroll costs
- PF / EPF Report — Provident fund contributions for filing

**Buttons:**
- **Generate Report** — Creates the report for the selected date range.
- **Download** (PDF or Excel) — Downloads the generated report.
- **Schedule Report** — Sets up automatic monthly/weekly email delivery of the report.

---

## Report Builder (`/hr/report-builder`)
**What it does:** A custom report creator. Instead of the fixed pre-built reports, this lets HR build their own table by choosing exactly which columns of employee data to include.

**How it works:**
1. Choose which data fields to include (Name, Department, Salary, Leave Balance, etc.)
2. Add filters (e.g., "Only show employees in the Engineering department")
3. Choose sort order
4. Preview the report
5. Download or save it as a template

**Buttons:**
- **Add Column** — Adds a data field to the report.
- **Remove Column** — Removes a field.
- **Add Filter** — Narrows the data by a condition.
- **Preview** — Shows a sample of the report.
- **Download** — Downloads the full report as Excel or CSV.
- **Save Template** — Saves this report configuration so you can run it again later.

---

## PF Reports (`/hr/pf-reports`)
**What it does:** Generates Provident Fund (PF/EPF) reports specifically formatted for submission to the government/EPFO. This is India-specific compliance reporting.

**Buttons:**
- **Generate Report** — Creates the PF report for the selected month.
- **Download ECR File** — Downloads the Electronic Challan-cum-Return file for EPFO filing.
- **Download Summary** — Downloads a human-readable summary.

---

## Compliance (`/hr/compliance`)
**What it does:** Tracks compliance tasks and documents. Reminds HR of upcoming statutory deadlines (filing dates, license renewals, etc.) and stores compliance documents.

**What you see:**
- A list of compliance tasks with deadlines
- Status: Upcoming / Due Soon / Overdue / Completed
- Document storage area for compliance certificates and filings

**Buttons:**
- **Mark as Completed** — Checks off a compliance task.
- **Upload Document** — Attaches a compliance document to a task.
- **Add Task** — Creates a custom compliance reminder.
- **Snooze** — Postpones a reminder.

---

## Documents (`/hr/documents`)
**What it does:** A document repository for company-wide HR documents — policies, handbooks, templates, contracts. Separate from employee-specific documents (those live on the employee's profile).

**Buttons:**
- **Upload Document** — Adds a new document to the library.
- **Create Folder** — Organises documents into folders.
- **Share** — Makes a specific document visible to specific employees or departments.
- **Download** — Downloads a document.
- **Delete** — Removes a document (asks for confirmation).

---

## Compensation (`/hr/compensation`)
**What it does:** An overview of salary data across the company. Helps HR benchmark salaries, identify pay gaps, and plan salary revisions.

**What you see:**
- A table of all employees with their current salary
- Salary bands per role/level
- Pay equity analysis (Are men and women paid equally for the same role? Are there outliers?)

**Buttons:**
- **Run Salary Revision** — Opens a bulk tool to give percentage-based raises to a group of employees.
- **Export** — Downloads the compensation data.
- **View History** — Shows the salary history for a specific employee.

---

## Salary Revisions (`/hr/salary-revisions` — accessed via Compensation)
**What it does:** Records salary changes for employees — promotions, annual increments, market corrections. Each revision is logged with the effective date and reason.

**Buttons:**
- **Add Revision** — Creates a salary change for an employee.
- **Approve** — Approves a pending revision (if your company uses an approval workflow).
- **Export** — Downloads revision history.

---

## Employee Movements (`/hr/employee-movements`)
**What it does:** Tracks internal transfers, promotions, and role changes. When someone moves from the "Engineering" department to "Product," or gets promoted from "Junior" to "Senior," that's recorded here as a movement.

**Buttons:**
- **Record Movement** — Logs a new transfer or promotion for an employee.
- **View History** — Shows all past movements for a specific employee.
- **Export** — Downloads the movements log.

---

## Reimbursements (`/hr/reimbursements`)
**What it does:** Manages employee expense reimbursement requests — when an employee spends their own money on a work expense (travel, client dinner, equipment) and needs to be paid back.

**What you see:**
- A list of all pending and processed reimbursement claims
- Each claim shows: Employee, description, amount, category, receipt attached, status

**Buttons:**
- **Approve** — Approves the claim and queues it for payment in the next payroll.
- **Reject** — Rejects the claim with a reason.
- **Download Receipt** — Downloads the receipt image the employee uploaded.
- **Export** — Downloads all reimbursement records.

---

## Travel Requests (`/hr/travel`)
**What it does:** Manages requests for business travel — when employees need to travel for work and need company approval and potentially expense coverage.

**Buttons:**
- **Approve** — Approves a travel request.
- **Reject** — Rejects it with a reason.
- **Book** (if integrated) — Opens the travel booking flow.
- **Export** — Downloads travel request history.

---

## Learning (`/hr/learning`)
**What it does:** The company's internal training and learning management system. HR can create courses, assign them to employees, and track completion.

**What you see:**
- Course library with categories
- Each course shows: Title, description, duration, number of lessons, enrolled count, completion rate

**Buttons:**
- **Create Course** — Opens the course editor to build a new training course with lessons, quizzes, and videos.
- **Assign Course** — Assigns a course to specific employees or departments.
- **View Progress** — Shows who has completed a course and who hasn't.
- **Edit Course** — Modifies an existing course.
- **Delete Course** — Removes a course.

---

## Notifications (`/hr/notifications`)
**What it does:** The HR team's notification centre — all system alerts, pending actions, and updates in one place. Things like "New leave request from John Smith" or "Payroll run completed."

**Buttons:**
- **Mark as Read** — Clears a notification.
- **Mark All as Read** — Clears all notifications at once.
- **Click on notification** — Takes you directly to the relevant page (e.g., clicking a leave request notification opens that request).

---

## Organization (`/hr/organization`)
**What it does:** A visual org chart of the entire company — who reports to whom. Displays the company hierarchy as a tree diagram.

**What you see:**
- The CEO/Founder at the top
- Each level of management branching down
- Employee name, photo, and title on each node

**Buttons:**
- **Zoom In / Zoom Out** — Adjusts the chart view.
- **Export** — Downloads the org chart as a PNG image or PDF.
- **Search** — Highlights a specific person in the chart.

---

## Audit Logs (`/hr/audit-logs`)
**What it does:** A tamper-proof record of every action taken in the system — who did what, and when. If someone changes a salary, deletes a record, or approves a request, it's logged here forever.

**What you see:**
- A chronological list: Timestamp, User who did it, Action taken, What was affected
- Example: "2026-06-29 14:30 | HR Admin | Approved Leave | John Smith - Annual Leave Jun 30–Jul 4"

**Buttons:**
- **Filter** — Filter by date range, user, or action type.
- **Export** — Downloads the audit log as a CSV for compliance purposes.

---

## Approvals (`/hr/approvals`)
**What it does:** A single queue for all items waiting for HR's approval — leave requests, expense claims, travel requests, regularization requests, and salary revisions. One place to action everything.

**Buttons:**
- **Approve** — Approves the item.
- **Reject** — Rejects with an optional reason.
- **View Details** — Opens the full details of the request.
- **Filter by Type** — Shows only leave requests, or only expenses, etc.

---

## Approval Config (`/hr/approval-config`)
**What it does:** Configures the rules for who needs to approve what. For example: "Leave requests under 3 days only need Manager approval. Leave over 3 days needs Manager + HR approval."

**Buttons:**
- **Edit Rules** — Changes the approval chain for a category.
- **Add Rule** — Creates a new approval flow.
- **Save** — Saves the configuration.

---

## Escalation (`/hr/escalation`)
**What it does:** Sets up and monitors automatic escalation rules — if a request isn't approved within X days, it automatically escalates to the next person up the chain.

**Buttons:**
- **Add Escalation Rule** — Creates a new escalation policy.
- **Edit** — Changes an existing rule.
- **Delete** — Removes a rule.

---

## Exit Checklist (`/hr/exit-checklist`)
**What it does:** The HR view of employee offboarding. When an employee resigns or is terminated, this page shows the checklist of tasks that need to be completed before their last day (equipment return, access revocation, final payslip, etc.).

**Buttons:**
- **Mark Task Complete** — Ticks off an offboarding step.
- **Add Custom Task** — Adds a company-specific step to the checklist.
- **Export Checklist** — Downloads the completed offboarding checklist as a PDF.

---

## Bulk Import (`/hr/bulk-import`)
*(described above in the Employees section)*

---

## Search (`/hr/search`)
**What it does:** A global search bar that searches across employees, documents, payslips, and policies simultaneously. Type a name or keyword and instantly see results from all categories.

**Buttons:**
- Clicking any result takes you directly to that item.

---

## Settings (`/hr/settings`)
**What it does:** HR-specific configuration options — not company-wide settings (those are in Admin), but the settings specific to how the HR portal behaves.

**Sections include:**
- Leave settings (approval flow, carry-forward rules)
- Attendance settings (work hours, grace period for late arrivals)
- Notification preferences (which alerts get sent to whom)

**Buttons:**
- **Save** — Saves the current section's settings.

---

## Profile (`/hr/profile`)
**What it does:** The HR team member's own personal profile — their name, contact info, and role. Same as an employee profile but for the logged-in HR user.

**Buttons:**
- **Edit Profile** — Opens fields to update name, phone, photo.
- **Change Password** — Opens the password change form.
- **Save** — Saves changes.

---

# 👤 EMPLOYEE PORTAL

The Employee portal is what regular employees see. It's a simplified view — employees can only see their own data, make requests, and view company information.

---

## Employee Dashboard (`/employee/dashboard`)
**What it does:** The employee's personal homepage. Shows their own attendance today, leave balance remaining, upcoming holidays, pending items that need their action, and recent payslips.

**What you see:**
- Today's attendance status (Clocked In / Clocked Out / Absent)
- Leave balance summary (Days remaining for each leave type)
- Recent notifications
- Upcoming company holidays
- Quick action shortcuts

**Buttons:**
- **Clock In** — Records the start of their work day.
- **Clock Out** — Records the end of their work day.
- **Request Leave** — Shortcut to the leave request form.
- **View Payslip** — Opens their most recent payslip.

---

## My Attendance (`/employee/attendance`)
**What it does:** The employee's personal attendance history — every day they've clocked in and out, total hours worked, and their status for each day.

**Buttons:**
- **Clock In / Clock Out** — Records attendance for today.
- **Request Regularization** — If the employee forgot to clock in or out on a past day, they can submit a request asking HR to manually fix that day's record. They explain what the actual times were.
- **Filter by Month** — Shows attendance for a specific month.
- **Export** — Downloads their attendance history as a spreadsheet.

---

## Request Leave (`/employee/request-leave`)
**What it does:** The form for an employee to apply for time off.

**What you fill in:**
- Leave type (Annual / Sick / Casual / Maternity / Paternity / etc.)
- Start date
- End date
- Half-day option (if they only need the morning or afternoon off)
- Reason (optional but recommended)

**Buttons:**
- **Submit Request** — Sends the leave request to their manager (or HR, depending on the approval rules). The employee gets a confirmation and can see the request in their Leave History.
- **Cancel** — Goes back without submitting.

---

## Leave History (`/employee/leave-history`)
**What it does:** Shows all the employee's past and current leave requests — approved, rejected, and pending. They can see exactly where each request stands.

**What you see:**
- Date range of each request
- Leave type
- Number of days
- Status: Pending / Approved / Rejected
- Reason for rejection (if rejected)

**Buttons:**
- **Cancel Request** — Withdraws a pending leave request (before it's been approved/rejected).
- **Reapply** — Opens the leave form again pre-filled with the same details (useful if a request was rejected and they want to modify and resubmit).

---

## Payslips (`/employee/payslips`)
**What it does:** Shows all of the employee's payslips — one per month they've been employed. Each payslip shows a full breakdown of what they earned and what was deducted.

**What a payslip shows:**
- Gross salary
- Each earning component (Basic, HRA, Travel Allowance, etc.)
- Each deduction (PF, TDS/Tax, Professional Tax, etc.)
- Net pay (take-home amount)

**Buttons:**
- **Download** — Downloads the payslip as a PDF.
- **Filter by Year** — Shows payslips from a specific year.

---

## Directory (`/employee/directory`)
**What it does:** A company-wide employee directory — a phonebook of all colleagues. Employees can search for anyone by name, department, or role and see their contact details and reporting line.

**What you see per person:**
- Name and profile photo
- Job title
- Department
- Email address
- Work phone (if provided)
- Who they report to

**Buttons:**
- **Search** — Filters the directory by name, department, or role.
- **Send Email** — Opens the employee's email client addressed to that colleague.

---

## Profile (`/employee/profile`)
**What it does:** The employee's own profile page — their personal information, emergency contacts, bank account details (for payroll), and uploaded documents.

**Sections:**
- Personal Info (name, DOB, address, phone)
- Emergency Contact
- Bank Details (account number, IFSC code — used for salary payments)
- Documents (upload ID proof, address proof, etc.)

**Buttons:**
- **Edit** — Unlocks fields for editing.
- **Save Changes** — Saves the updated information.
- **Upload Document** — Attaches a personal document (Aadhaar, PAN, passport, etc.).
- **Delete Document** — Removes an uploaded document.

---

## Documents (`/employee/documents`)
**What it does:** Shows documents that HR has shared with the employee — employment contract, offer letter, policy handbook, etc.

**Buttons:**
- **Download** — Downloads the document as a PDF.
- **View** — Opens a preview of the document in the browser.

---

## Performance (`/employee/performance`)
**What it does:** Shows the employee's performance reviews — their self-assessments, peer feedback received, and manager evaluations. They can see their scores and the written feedback given about them.

**Buttons (during an active review cycle):**
- **Submit Self Review** — Opens the form to write their own self-assessment.
- **Submit Peer Feedback** — Opens the form to give feedback on a colleague.
- **View Past Reviews** — Shows completed reviews from previous periods.

---

## Learning (`/employee/learning`)
**What it does:** The employee's training hub — courses assigned to them by HR, plus any optional courses they can self-enroll in from the company library.

**What you see:**
- Assigned courses with a due date and progress bar
- Available courses they can choose to take
- Completed courses with a completion badge

**Buttons:**
- **Start / Continue Course** — Opens the course and picks up from where they left off.
- **Enroll** — Joins an optional course.
- **Mark Lesson Complete** — Checks off a lesson within a course.
- **Download Certificate** — If the course has a completion certificate, this downloads it.

---

## Reimbursements (`/employee/reimbursements`)
**What it does:** Where employees submit expense reimbursement claims — for any money they spent out of pocket on work-related expenses.

**What you fill in:**
- Expense category (Travel, Meals, Equipment, etc.)
- Amount
- Date of expense
- Description
- Upload receipt (photo or PDF)

**Buttons:**
- **Submit Claim** — Sends the reimbursement request to HR for approval.
- **Cancel** — Discards the claim.
- **View Status** — Shows whether past claims are pending, approved, or paid.

---

## Travel Requests (`/employee/travel`)
**What it does:** Where employees request approval for business travel.

**What you fill in:**
- Destination
- Purpose of travel
- Travel dates
- Estimated costs
- Notes

**Buttons:**
- **Submit Request** — Sends the travel request for manager/HR approval.
- **Cancel** — Discards the request.

---

## Payroll Advances (`/employee/payroll-advances`)
**What it does:** Where employees request a salary advance — getting part of next month's pay early. They explain why they need it and how much.

**Buttons:**
- **Request Advance** — Submits the request to HR.
- **View Status** — Checks on a submitted request.

---

## Exit Checklist (`/employee/exit-checklist`)
**What it does:** When an employee is leaving the company, this page shows their personal offboarding checklist — tasks they need to complete before their last day (returning equipment, handing over projects, etc.).

**Buttons:**
- **Mark Complete** — Ticks off a task on the checklist.

---

## Notifications (`/employee/notifications`)
**What it does:** All notifications for this employee — leave approvals/rejections, payslip available, review requests, course assignments, etc.

**Buttons:**
- **Mark as Read** — Clears the notification.
- **Mark All as Read** — Clears everything.
- Clicking a notification takes you to the relevant page.

---

## Settings (`/employee/settings`)
**What it does:** The employee's personal app preferences — notification settings, language, theme (light/dark mode).

**Buttons:**
- **Save** — Saves preferences.

---

## Search (`/employee/search`)
**What it does:** Search across the company directory, policies, and documents from anywhere in the employee portal.

---

# 🧑‍💼 MANAGER PORTAL

The Manager portal is for team leads and department managers. They can see and manage their own team's data — approve leave, view attendance, give performance feedback. They cannot see other teams' data.

---

## Manager Dashboard (`/manager/dashboard`)
**What it does:** The manager's overview of their team — who's in today, who's on leave, any pending approvals that need their attention, and upcoming team events.

**What you see:**
- Team headcount
- Today's team attendance (who's in, who's out, who's remote)
- Pending leave requests from their team
- Upcoming team leaves (so they can plan)

**Buttons:**
- **Approve Leave** — Quick-approve a leave request directly from the dashboard.
- **View Team** — Goes to the full team roster.
- **View Approvals** — Opens the full approvals queue.

---

## Team (`/manager/team`)
**What it does:** The full roster of everyone who reports to this manager, either directly or indirectly. Each person's profile, attendance, and leave data is accessible from here.

**Buttons:**
- **View Profile** — Opens a team member's full employee profile.
- **View Attendance** — Shows that person's attendance record.
- **Send Message** (if messaging is set up) — Starts a message to that person.

---

## Approvals (`/manager/approvals`)
**What it does:** All items from the manager's team that need their approval — leave requests, expense claims, travel requests. Same concept as the HR approvals queue but scoped to just this manager's team.

**Buttons:**
- **Approve** — Approves the item.
- **Reject** — Rejects with a reason.
- **View Details** — Opens the full request.

---

## Leave Requests (`/manager/leave-requests`)
**What it does:** Specifically the leave requests from this manager's team. A filtered view of just leave — separate from other approval types.

**Buttons:**
- **Approve** — Approves the leave.
- **Reject** — Rejects it with a reason.
- **Check Calendar** — Opens the team calendar to see if approving would leave the team short-staffed.

---

## Team Attendance (`/manager/team-attendance`)
**What it does:** The attendance view for the manager's team only — the same layout as the HR attendance page but filtered to show only this manager's direct reports.

**Buttons:**
- **Export CSV** — Downloads the team's attendance data.
- **Filter by Date / Status** — Narrows the view.

---

## Team Calendar (`/manager/team-calendar`)
**What it does:** A visual calendar showing when people on this manager's team are on leave. Helps the manager plan projects and meetings around team absences.

**Buttons:**
- **Previous / Next Month** — Navigate the calendar.
- **Filter by Person** — Shows only one team member's leaves.

---

## People (`/manager/people`)
**What it does:** Similar to the Team page — a people-management view of the manager's direct reports. Focuses on HR data like role, salary band level, performance rating, and tenure.

**Buttons:**
- **View Profile** — Opens an employee's profile.
- **Initiate Review** (if a review cycle is active) — Starts writing a performance review for a team member.

---

## My Attendance (`/manager/my-attendance`)
**What it does:** The manager's own personal attendance record — identical to the employee attendance page.

**Buttons:**
- **Clock In / Clock Out**
- **Request Regularization**

---

## Request Leave (`/manager/request-leave`)
**What it does:** The manager's own personal leave request form — identical to the employee leave request page.

**Buttons:**
- **Submit Request** — Their leave request goes to HR (not to themselves).

---

## Performance (`/manager/performance`)
**What it does:** Shows the performance review data for the manager's team — self-assessments they've submitted, and the manager's own reviews they need to write for each team member.

**Buttons:**
- **Write Review** — Opens the performance review form for a specific team member.
- **Submit Review** — Submits a completed review.
- **View Past Reviews** — Shows past review cycles.

---

## Reports (`/manager/reports`)
**What it does:** Pre-built reports scoped to just the manager's team — attendance summary, leave utilisation, and headcount. They can't see company-wide data.

**Buttons:**
- **Generate** — Creates the selected report.
- **Download** — Downloads as spreadsheet or PDF.

---

## Payslips (`/manager/payslips`)
**What it does:** The manager's own personal payslip history.

**Buttons:**
- **Download** — Downloads a payslip PDF.

---

## Payroll Advances (`/manager/payroll-advances`)
**What it does:** The manager's own personal salary advance requests.

---

## Reimbursements (`/manager/reimbursements`)
**What it does:** The manager's own expense claims.

---

## Directory (`/manager/directory`)
**What it does:** The full company directory — same as the employee directory. Managers can look up anyone in the company.

---

## Notifications, Settings, Profile, Search
**Same as the employee equivalents — but for the manager's own account.**

---

# 🔁 END-TO-END WORKFLOW GUIDES

These are the most common tasks and exactly how to complete them from start to finish.

---

## Workflow 1: Onboarding a New Employee

> **Who does this:** HR

1. Go to **HR → Employees**
2. Click **Invite Employee**
3. Fill in their name, email, department, title, start date, and manager
4. Click **Send Invite**
5. The employee receives an email → they click the link → set a password → log in
6. The employee fills in their personal details, bank account, and uploads documents on their **Profile** page
7. HR assigns them a salary structure at **HR → Salary Structures → Assign to Employee**
8. HR assigns them to a shift at **HR → Shifts → Assign Shift** (if applicable)
9. Employee is now fully set up and will appear in attendance and payroll

---

## Workflow 2: Running Monthly Payroll

> **Who does this:** HR

1. Go to **HR → Payroll**
2. Confirm the correct month is selected
3. Click **Run Payroll** — the system calculates everyone's pay based on salary structures, attendance, leaves, and any adjustments
4. Review the table — check each person's gross pay, deductions, and net pay
5. If any entries look wrong, click **Edit Entry** to manually adjust
6. Once everything looks correct, click **Approve Payroll**
7. Employees can now see their payslips in **Employee → Payslips**
8. Click **Export Payroll Sheet** to download the bank transfer file for your finance team

---

## Workflow 3: Processing a Leave Request

> **Who does this:** Manager (first) then HR (if required by your rules)

1. Manager gets a notification that a team member has requested leave
2. Manager goes to **Manager → Approvals** or clicks the notification
3. Manager sees the request: employee name, dates, type, and reason
4. Manager clicks **Approve** or **Reject** (with a reason if rejecting)
5. Employee gets a notification of the decision
6. If approved: the leave is automatically reflected in attendance records, leave balance is reduced, and the team calendar is updated

---

## Workflow 4: Hiring Someone (Full Recruitment Flow)

> **Who does this:** HR

1. Go to **HR → Recruitment → Post New Job**
2. Fill in the job title, department, location, salary range, description, required skills, and closing date
3. Click **Publish** — the job appears on the internal **Job Board** for employees to see
4. Candidates apply via the Job Board (employees click "Apply Now") — or HR manually adds external candidates
5. HR reviews applications at **HR → Recruitment → View Applications**
6. HR moves candidates through stages: Applied → Screening → Interview → Offer
7. During "Interview" stage: click **Schedule Interview** to set up interview times
8. When ready to hire: click **Send Offer Letter** → a formatted offer letter is emailed to the candidate
9. Candidate accepts → HR clicks **Mark as Hired** → the candidate is automatically converted into an employee record
10. Go to **HR → Employees → Invite Employee** to send them their login

---

## Workflow 5: An Employee Claiming an Expense

> **Who does this:** Employee submits, HR approves, Finance pays

1. Employee goes to **Employee → Reimbursements**
2. Fills in the category, amount, date, description, and uploads a photo of the receipt
3. Clicks **Submit Claim**
4. HR sees the claim in **HR → Reimbursements** or **HR → Approvals**
5. HR reviews the receipt and amount
6. HR clicks **Approve** — the amount is queued for the next payroll run
7. Employee gets notified and sees the amount appear in their next payslip

---

## Workflow 6: Running a Performance Review

> **Who does this:** HR sets it up, Employees and Managers complete it

1. HR goes to **HR → Performance → Create Review Cycle**
2. HR sets the review period name, start date, end date, and which employees are included
3. HR clicks **Launch** — all employees are notified
4. **Employees** go to **Employee → Performance → Submit Self Review** and fill in their self-assessment
5. **Managers** go to **Manager → Performance → Write Review** and fill in their ratings and comments for each team member
6. If peer reviews are enabled, employees also fill in feedback for their colleagues
7. HR monitors completion at **HR → Performance** — sends reminders to anyone who hasn't submitted yet by clicking **Send Reminders**
8. After the deadline, HR clicks **Close Cycle** — no more submissions accepted
9. Managers can view aggregated results and discuss them with their team
10. HR can **Export Results** for salary revision planning

---

## Workflow 7: Setting Up Payroll for the First Time

> **Who does this:** Admin then HR

1. Admin completes the **Onboarding wizard** → sets up company currency, pay cycle, and tax settings
2. HR goes to **HR → Salary Components** → creates the components of a salary (Basic, HRA, Travel Allowance, PF deduction, etc.)
3. HR goes to **HR → Salary Structures** → combines components into a structure (e.g., "Senior Engineer Package")
4. HR goes to **HR → Salary Structures → Assign to Employee** → assigns the right structure to each employee
5. HR goes to **HR → Employees** → opens each employee's profile and confirms their salary details
6. At the end of the first month, HR runs payroll using Workflow 2 above

---

## Workflow 8: Adding a Company Holiday

> **Who does this:** HR

1. Go to **HR → Holidays**
2. Click **Add Holiday**
3. Enter the date and name (e.g., "Diwali - October 20, 2026")
4. Click **Save**
5. The holiday is now in the company calendar — if an employee applies for leave on that day, the system will warn them it's already a holiday and won't count it against their leave balance

---

## Workflow 9: An Employee Forgot to Clock In (Regularization)

> **Who does this:** Employee submits, HR approves

1. Employee goes to **Employee → My Attendance**
2. Finds the day with missing attendance
3. Clicks **Request Regularization**
4. Fills in the actual times they were at work (e.g., "I was here from 9:30am to 6pm but forgot to clock in")
5. Clicks **Submit**
6. HR sees the request in **HR → Attendance → Regularization Requests** tab
7. HR reviews and clicks **Approve** — the attendance record for that day is corrected
8. Employee gets notified

---

## Workflow 10: An Employee Leaves the Company

> **Who does this:** HR

1. HR receives the resignation
2. HR goes to **HR → Exit Checklist** and opens a checklist for this employee
3. The checklist shows all offboarding tasks: collect laptop, revoke system access, process final payslip, send experience letter, etc.
4. HR and the employee both work through their respective checklist tasks (employee sees their tasks at **Employee → Exit Checklist**)
5. On the final day, HR runs one last payroll for this employee
6. HR marks the employee as **Inactive** on their profile
7. The employee's login is deactivated — they can no longer sign in
8. All their historical records (payslips, attendance, reviews) remain in the system for compliance purposes

---

## ⚠️ One Known Technical Issue to Be Aware Of

**`cursor-effects.js` and `theme-init.js` are blocked by the Content Security Policy in development.**

In plain English: Two small scripts that handle visual effects (cursor animations, theme switching) are being prevented from loading by the app's own security settings when running locally. The app works fine and all pages load correctly — users just won't see cursor animations in local dev. This does not affect production deployments. It's a low-priority technical fix for the engineering team.

---

*This document covers all pages, buttons, and workflows in Continuum as of the June 2026 codebase audit.*
