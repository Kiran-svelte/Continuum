# Continuum HRMS - Vibe Coding Prompt
## For Human Developers & AI Coding Assistants

**Project**: Continuum - Enterprise HRMS Platform  
**Version**: 4.0  
**Architecture**: Next.js 15 + TypeScript + Prisma + PostgreSQL  
**Deployment**: Vercel (Frontend) + Neon (Database) + Upstash (Redis)

---

## 🎯 Project Overview

Continuum is a **multi-tenant, enterprise-grade HRMS** with 64 services covering:
- Leave & Attendance Management (✅ 95% complete)
- Payroll Processing (🟡 50% complete)
- Performance Management (🔴 Build from scratch)
- Recruitment/ATS (🟡 40% complete)
- Learning Management System (🔴 Build from scratch)
- Compensation Planning (🔴 Build from scratch)
- Employee Self-Service Portal (🟡 60% complete)
- Analytics & Reporting (🔴 10% complete)
- And 56 more services...

**Current State**: 38% complete (9 done, 10 partial, 45 missing)  
**Target**: 100% enterprise-ready with full configurability

---

## 📚 Critical Documentation

Before coding, read these files in order:

1. **`CRITICAL_WORKFLOW_ISSUES_AUDIT.md`** - Understand what's broken
2. **`SOLUTION_INDEX.md`** - Navigate the solution structure  
3. **`COMPLETE_SERVICES_SUMMARY.md`** - See all 64 services overview
4. **`COMPLETE_SOLUTION_MAPPING.md`** - Detailed implementation specs

**For specific issues**: Check `SOLUTION_MASTER_INDEX.md` for identifiers and `SOLUTION_DETAILED_BREAKDOWN.md` for code examples.

---

## 🏗️ Architecture Principles

### 1. Multi-Tenant Isolation
```typescript
// ALWAYS filter by company_id
const employees = await prisma.employee.findMany({
  where: {
    org_id: companyId, // ✅ REQUIRED
    status: 'active'
  }
});

// ❌ NEVER do this (security breach)
const employees = await prisma.employee.findMany({
  where: { status: 'active' }
});
```

### 2. Plan-Based Feature Gating
```typescript
// Check before executing any feature
import { checkPlanFeature } from '@/lib/config/plan-checker';

export async function POST(request: NextRequest) {
  const employee = await getAuthEmployee(request);
  
  // Check plan entitlement
  const hasPerformance = await checkPlanFeature(
    employee.org_id, 
    'performance_management'
  );
  
  if (!hasPerformance) {
    return NextResponse.json({
      error: 'Performance management not included in your plan',
      upgrade_url: '/admin/upgrade'
    }, { status: 402 }); // Payment Required
  }
  
  // Continue with feature...
}
```

### 3. RBAC Permission Checks
```typescript
import { requireApiPermission } from '@/lib/api-permission-guard';

export async function PATCH(request: NextRequest) {
  // Check authentication + permission
  const authResult = await requireApiPermission(
    request, 
    'payroll.generate'
  );
  
  if (authResult instanceof NextResponse) {
    return authResult; // Permission denied
  }
  
  const { employee } = authResult;
  // Continue with authorized action...
}
```

### 4. Configuration-Driven Logic
```typescript
import { getModuleConfig } from '@/lib/config/module-resolver';

// Load company-specific configuration
const leaveConfig = await getModuleConfig(companyId, 'leave');

if (!leaveConfig) {
  throw new Error('Leave module not enabled');
}

// Use configured settings (never hardcode)
const maxDays = leaveConfig.config.max_leave_days_per_request;
const requiresAttachment = leaveConfig.config.require_attachment_above_days;
```

### 5. Optimistic Locking (Prevent Race Conditions)
```typescript
// ✅ CORRECT: Use optimistic locking
const currentRequest = await prisma.leaveRequest.findUnique({
  where: { id: requestId }
});

const updated = await prisma.leaveRequest.updateMany({
  where: {
    id: requestId,
    updated_at: currentRequest.updated_at // ✅ Optimistic lock
  },
  data: { status: 'approved' }
});

if (updated.count === 0) {
  throw new Error('Request was modified concurrently, please retry');
}
```

---

## 🎨 UI/UX Guidelines

### 1. Progressive Disclosure
```tsx
// Show advanced options only when needed
const [showAdvanced, setShowAdvanced] = useState(false);

return (
  <form>
    {/* Basic fields always visible */}
    <Input label="Leave Type" {...} />
    <DatePicker label="Start Date" {...} />
    
    {/* Advanced options collapsed by default */}
    <Button 
      variant="ghost" 
      onClick={() => setShowAdvanced(!showAdvanced)}
    >
      Advanced Options {showAdvanced ? '▲' : '▼'}
    </Button>
    
    {showAdvanced && (
      <div className="mt-4 space-y-4 border-l-2 pl-4">
        <Input label="Reason Code" {...} />
        <Switch label="Emergency Leave" {...} />
      </div>
    )}
  </form>
);
```

### 2. Contextual Help
```tsx
import { HelpCircle } from 'lucide-react';
import { Tooltip } from '@/components/ui/tooltip';

<div className="flex items-center gap-2">
  <label>Sandwich Rule</label>
  <Tooltip content="Weekends between leave days are counted as leave">
    <HelpCircle className="h-4 w-4 text-gray-400" />
  </Tooltip>
</div>
```

### 3. Smart Defaults
```tsx
// Auto-fill based on context
const { data: defaults } = await fetch('/api/leaves/defaults');

<form>
  <Input 
    label="Manager" 
    defaultValue={defaults.manager_name} 
    readOnly
  />
  <Input 
    label="Current Balance" 
    value={`${defaults.balance} days`}
    readOnly
  />
</form>
```

### 4. Inline Validation
```tsx
<Input
  label="Email"
  {...register('email', {
    validate: async (value) => {
      const exists = await checkEmailExists(value);
      return exists ? 'Email already registered' : true;
    }
  })}
  error={errors.email?.message}
/>
```

---

## 🔐 Security Checklist

For every API route, ensure:

- [ ] Authentication check (`getAuthEmployee` or `getAuthSuperAdmin`)
- [ ] Permission check (`requireApiPermission` or `requirePermissionGuard`)
- [ ] Plan feature check (`checkPlanFeature`)
- [ ] Module enabled check (`getModuleConfig`)
- [ ] Input validation (Zod schema)
- [ ] Input sanitization (XSS prevention)
- [ ] SQL injection prevention (use Prisma, never raw SQL)
- [ ] Rate limiting (for sensitive operations)
- [ ] Audit logging (for data modifications)
- [ ] CSRF protection (automatic with Next.js)

---

## 🧪 Testing Requirements

### Unit Tests
```typescript
// tests/services/leave-submit.test.ts
import { describe, test, expect } from '@jest/globals';
import { submitLeaveRequest } from '@/lib/services/leave-submit';

describe('Leave Submission', () => {
  test('should reject if insufficient balance', async () => {
    const result = await submitLeaveRequest({
      employeeId: 'emp-123',
      leaveType: 'CL',
      startDate: '2026-07-01',
      endDate: '2026-07-05',
      totalDays: 5,
      balance: 2 // Insufficient
    });
    
    expect(result.success).toBe(false);
    expect(result.error).toContain('Insufficient balance');
  });
  
  test('should handle concurrent submissions', async () => {
    // Test race condition handling
  });
});
```

### Integration Tests
```typescript
// tests/api/leaves.test.ts
test('POST /api/leaves requires authentication', async () => {
  const response = await fetch('/api/leaves', {
    method: 'POST',
    body: JSON.stringify({...})
  });
  
  expect(response.status).toBe(401);
});
```

---

## 📦 File Structure

```
web/
├── app/
│   ├── (portals)/
│   │   ├── admin/(main)/          # Admin portal pages
│   │   ├── hr/(main)/             # HR portal pages
│   │   ├── manager/(main)/        # Manager portal pages
│   │   ├── employee/(main)/       # Employee portal pages
│   │   └── super-admin/(main)/    # Super admin portal
│   ├── api/                       # API routes
│   │   ├── leaves/
│   │   ├── attendance/
│   │   ├── payroll/
│   │   └── performance/
│   └── (marketing)/               # Public pages
├── components/
│   ├── ui/                        # Base UI components (Radix)
│   ├── leave/                     # Leave-specific components
│   ├── attendance/
│   └── [module]/
├── lib/
│   ├── services/                  # Business logic
│   ├── config/                    # Configuration services
│   ├── rbac.ts                    # Permission system
│   ├── auth-guard.ts              # Auth middleware
│   └── [module]-engine.ts         # Module engines
├── prisma/
│   ├── schema.prisma              # Database schema
│   └── migrations/                # Database migrations
└── tests/
    ├── unit/
    ├── integration/
    └── e2e/
```

---

## 🚀 Development Workflow

### Step 1: Pick a Service
```bash
# From COMPLETE_SERVICES_SUMMARY.md
# Example: SVC-005 (Performance Management)

# Check status: 🔴 Build from scratch
# Effort: 20 days
# Dependencies: SVC-001 (Employees), SVC-012 (RBAC)
```

### Step 2: Create Database Migration
```bash
cd web
npx prisma migrate dev --name add_performance_management

# Edit migration file to add:
# - Goal table
# - ReviewCycle table
# - ReviewInstance table
# - PerformanceReviewComment table
```

### Step 3: Update Schema
```prisma
// prisma/schema.prisma
model Goal {
  id               String       @id @default(uuid())
  company_id       String
  employee_id      String
  title            String
  // ... rest of fields
}
```

### Step 4: Generate Prisma Client
```bash
npx prisma generate
```

### Step 5: Create Backend Service
```typescript
// lib/performance/goal-engine.ts
export async function createGoal(input: CreateGoalInput) {
  // Validate plan feature
  const hasPerformance = await checkPlanFeature(
    input.companyId, 
    'performance_management'
  );
  if (!hasPerformance) throw new Error('Feature not available');
  
  // Business logic...
  return prisma.goal.create({...});
}
```

### Step 6: Create API Route
```typescript
// app/api/performance/goals/route.ts
export async function POST(request: NextRequest) {
  const authResult = await requireApiPermission(
    request, 
    'performance.manage_goals'
  );
  
  if (authResult instanceof NextResponse) return authResult;
  
  const { employee } = authResult;
  const data = await request.json();
  
  const goal = await createGoal({
    ...data,
    companyId: employee.org_id,
    createdBy: employee.id
  });
  
  return NextResponse.json(goal, { status: 201 });
}
```

### Step 7: Create UI Page
```tsx
// app/(portals)/hr/(main)/performance/goals/new/page.tsx
export default function NewGoalPage() {
  return (
    <div>
      <h1>Create Goal</h1>
      <GoalForm onSubmit={handleSubmit} />
    </div>
  );
}
```

### Step 8: Create Components
```tsx
// components/performance/goal-form.tsx
export function GoalForm({ onSubmit }: Props) {
  const form = useForm<GoalFormData>({
    resolver: zodResolver(goalSchema)
  });
  
  return <form>{/* Fields */}</form>;
}
```

### Step 9: Write Tests
```typescript
// tests/performance/goal-engine.test.ts
test('should create goal with valid data', async () => {
  // Test implementation
});
```

### Step 10: Update Documentation
```markdown
<!-- docs/modules/performance-management.md -->
# Performance Management

## Goal Setting
...
```

---

## 🐛 Common Pitfalls to Avoid

### 1. Forgetting Multi-Tenancy
```typescript
// ❌ BAD - Will leak data across companies
const leaves = await prisma.leaveRequest.findMany({
  where: { status: 'pending' }
});

// ✅ GOOD - Properly isolated
const leaves = await prisma.leaveRequest.findMany({
  where: { 
    company_id: companyId,
    status: 'pending' 
  }
});
```

### 2. Hardcoding Business Rules
```typescript
// ❌ BAD - Hardcoded
const MAX_LEAVE_DAYS = 15;

// ✅ GOOD - Configurable
const config = await getModuleConfig(companyId, 'leave');
const MAX_LEAVE_DAYS = config.config.max_leave_days_per_request;
```

### 3. Missing Permission Checks
```typescript
// ❌ BAD - Anyone can approve
export async function POST(request: NextRequest) {
  const { requestId } = await request.json();
  await approveLeave(requestId);
}

// ✅ GOOD - Permission enforced
export async function POST(request: NextRequest) {
  const authResult = await requireApiPermission(
    request, 
    'leave.approve_team'
  );
  if (authResult instanceof NextResponse) return authResult;
  
  const { employee } = authResult;
  await approveLeave(requestId, employee.id);
}
```

### 4. Not Handling Race Conditions
```typescript
// ❌ BAD - Race condition possible
const balance = await getBalance(empId);
if (balance >= days) {
  await deductBalance(empId, days);
}

// ✅ GOOD - Atomic transaction
await prisma.$transaction(async (tx) => {
  const balance = await tx.leaveBalance.findUnique({
    where: { ... }
  });
  
  if (balance.remaining < days) throw new Error('Insufficient');
  
  await tx.leaveBalance.update({
    where: { 
      id: balance.id,
      updated_at: balance.updated_at // Optimistic lock
    },
    data: { used_days: { increment: days } }
  });
});
```

---

## 🎯 Quick Reference

### Environment Variables
```bash
# Core
DATABASE_URL="postgresql://..."
DIRECT_URL="postgresql://..."
JWT_SECRET="..."
SESSION_SECRET="..."

# Services
CONSTRAINT_ENGINE_URL="https://..."
UPSTASH_REDIS_REST_URL="https://..."
OPENAI_API_KEY="sk-..."

# Check .env.example for complete list
```

### Useful Commands
```bash
# Development
npm run dev                    # Start dev server
npm run build                  # Build for production
npm run lint                   # Run linter

# Database
npx prisma migrate dev         # Create migration
npx prisma migrate deploy      # Apply migrations
npx prisma studio              # Open DB GUI
npx prisma generate            # Generate client

# Testing
npm test                       # Run tests
npm test -- --watch            # Watch mode
npm test -- --coverage         # With coverage
```

### Key Libraries
- **Next.js 15**: App Router, Server Components
- **Prisma 6**: ORM + migrations
- **Zod**: Schema validation
- **jose**: JWT handling (Edge-compatible)
- **Radix UI**: Accessible components
- **Tailwind CSS**: Styling
- **Recharts**: Data visualization
- **date-fns**: Date utilities

---

## 📞 Getting Help

1. **Architecture Questions**: See `docs/architecture/`
2. **API Documentation**: See `docs/api/`
3. **Module Guides**: See `docs/modules/`
4. **Troubleshooting**: See `docs/troubleshooting/`
5. **Code Examples**: Check `tests/` for working examples

---

## ✅ Definition of Done

Before marking a service as complete:

- [ ] Database migration applied
- [ ] Prisma schema updated
- [ ] Backend service implemented
- [ ] API routes created with security
- [ ] UI pages built (all portals)
- [ ] Components tested in isolation
- [ ] Unit tests passing (>80% coverage)
- [ ] Integration tests passing
- [ ] Permission guards verified
- [ ] Plan feature checks added
- [ ] Configuration UI built
- [ ] Documentation written
- [ ] Code review completed
- [ ] QA testing passed
- [ ] Deployed to staging
- [ ] Performance tested
- [ ] Accessibility checked (WCAG 2.1 AA)

---

**Now you're ready to build enterprise-grade HRMS features! 🚀**

Pick a service from `COMPLETE_SERVICES_SUMMARY.md` and start coding! Return only when every services are ready fo production.
