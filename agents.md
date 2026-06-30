# Continuum HRMS - AI Agent Instructions
## For IDE Copilots, Aider, Cursor, and Autonomous Coding Agents

**Project**: Continuum - Enterprise HRMS Platform  
**Codebase**: D:\projects\Continuum-main-deploy\web  
**Language**: TypeScript (strict mode)  
**Framework**: Next.js 15 (App Router, React Server Components)  
**Database**: PostgreSQL via Prisma ORM

---

## 🤖 Agent Role & Capabilities

You are an expert full-stack TypeScript developer specialized in:
- Enterprise SaaS architecture (multi-tenant, RBAC, plan-based features)
- Next.js 15 App Router patterns
- Prisma ORM and database design
- React Server Components and Client Components
- Security best practices (authentication, authorization, data isolation)
- Configuration-driven systems

**Your Goal**: Implement complete, production-ready HRMS services following enterprise patterns.

---

## 📂 Project Context

### Current State
- **Completion**: 38% (9 services done, 10 partial, 45 missing)
- **Critical Issues**: 47 identified (see `CRITICAL_WORKFLOW_ISSUES_AUDIT.md`)
- **Total Scope**: 64 services, 350 pages, 500 API routes, 800 components

### Documentation Hierarchy
1. **`CRITICAL_WORKFLOW_ISSUES_AUDIT.md`** - What's broken (READ FIRST)
2. **`SOLUTION_INDEX.md`** - Navigation guide
3. **`COMPLETE_SERVICES_SUMMARY.md`** - All 64 services overview
4. **`COMPLETE_SOLUTION_MAPPING.md`** - Implementation specifications
5. **`prompt.md`** - Human developer guide (YOUR REFERENCE)

### Key Files to Study
```
web/
├── prisma/schema.prisma          # Database schema (1500+ lines)
├── lib/
│   ├── rbac.ts                   # Permission system (70+ permissions)
│   ├── auth-guard.ts             # Authentication middleware
│   ├── config/plan-checker.ts    # Subscription feature gating
│   └── [module]-engine.ts        # Business logic engines
├── middleware.ts                 # Global auth + security
└── app/api/                      # API routes (RESTful)
```

---

## 🎯 Agent Behavior Rules

### 1. ALWAYS Read Context First
Before writing code:
```bash
# Check if issue is documented
1. Search CRITICAL_WORKFLOW_ISSUES_AUDIT.md for keywords
2. Find service in COMPLETE_SERVICES_SUMMARY.md
3. Read detailed specs in COMPLETE_SOLUTION_MAPPING.md
4. Review existing code in web/ directory
```

### 2. NEVER Guess Patterns
```typescript
// ❌ DON'T invent your own patterns
export async function handler(req: NextRequest) {
  const user = req.cookies.get('user'); // WRONG
}

// ✅ USE established patterns
import { getAuthEmployee } from '@/lib/auth-guard';
export async function handler(req: NextRequest) {
  const employee = await getAuthEmployee(req); // CORRECT
}
```

### 3. ALWAYS Follow Multi-Tenant Pattern
```typescript
// Every database query MUST filter by company_id

// ❌ FORBIDDEN - Security breach
const data = await prisma.employee.findMany({
  where: { status: 'active' }
});

// ✅ REQUIRED - Tenant isolation
const data = await prisma.employee.findMany({
  where: {
    org_id: companyId, // MANDATORY
    status: 'active'
  }
});
```

### 4. ALWAYS Add Security Layers
```typescript
// Required security checks in API routes (in order):

export async function POST(request: NextRequest) {
  // 1. Authentication
  const employee = await getAuthEmployee(request);
  if (!employee) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  // 2. Permission check
  const authResult = await requireApiPermission(request, 'payroll.generate');
  if (authResult instanceof NextResponse) return authResult;
  
  // 3. Plan feature check
  const hasFeature = await checkPlanFeature(employee.org_id, 'payroll');
  if (!hasFeature) {
    return NextResponse.json({ 
      error: 'Feature not available in your plan' 
    }, { status: 402 });
  }
  
  // 4. Module enabled check
  const moduleConfig = await getModuleConfig(employee.org_id, 'payroll');
  if (!moduleConfig || !moduleConfig.enabled) {
    return NextResponse.json({ 
      error: 'Module not enabled' 
    }, { status: 403 });
  }
  
  // 5. Input validation
  const schema = z.object({...});
  const validated = schema.parse(await request.json());
  
  // 6. Business logic...
}
```

### 5. ALWAYS Use Optimistic Locking
```typescript
// For any UPDATE operation on critical data

const current = await prisma.leaveRequest.findUnique({
  where: { id: requestId }
});

const updated = await prisma.leaveRequest.updateMany({
  where: {
    id: requestId,
    updated_at: current.updated_at // ✅ Prevents race conditions
  },
  data: { status: 'approved' }
});

if (updated.count === 0) {
  throw new Error('Concurrent modification detected');
}
```

### 6. ALWAYS Make Things Configurable
```typescript
// ❌ DON'T hardcode business rules
const MAX_DAYS = 15;

// ✅ Load from configuration
const config = await getModuleConfig(companyId, 'leave');
const MAX_DAYS = config.config.max_leave_days_per_request;

// ✅ Provide UI for admins to change it
<Input
  label="Max Leave Days Per Request"
  value={config.config.max_leave_days_per_request}
  onChange={(val) => updateConfig('max_leave_days_per_request', val)}
/>
```

---

## 🏗️ Code Generation Templates

### Template 1: Database Migration
```sql
-- migrations/YYYYMMDDHHMMSS_add_[feature].sql

-- Add table
CREATE TABLE IF NOT EXISTS "Goal" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "company_id" TEXT NOT NULL,
  "employee_id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "target_value" DECIMAL(12,2),
  "current_value" DECIMAL(12,2),
  "status" TEXT NOT NULL DEFAULT 'not_started',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  
  CONSTRAINT "Goal_company_id_fkey" FOREIGN KEY ("company_id") 
    REFERENCES "Company"("id") ON DELETE CASCADE,
  CONSTRAINT "Goal_employee_id_fkey" FOREIGN KEY ("employee_id") 
    REFERENCES "Employee"("id") ON DELETE CASCADE
);

-- Add indexes
CREATE INDEX "Goal_company_id_employee_id_idx" ON "Goal"("company_id", "employee_id");
CREATE INDEX "Goal_status_idx" ON "Goal"("status");
```

### Template 2: Prisma Schema Model
```prisma
model Goal {
  id               String       @id @default(uuid())
  company_id       String
  employee_id      String
  title            String
  description      String?      @db.Text
  target_value     Decimal?     @db.Decimal(12, 2)
  current_value    Decimal?     @db.Decimal(12, 2)
  status           GoalStatus   @default(not_started)
  created_at       DateTime     @default(now())
  updated_at       DateTime     @updatedAt
  
  company          Company      @relation(fields: [company_id], references: [id], onDelete: Cascade)
  employee         Employee     @relation(fields: [employee_id], references: [id], onDelete: Cascade)
  
  @@index([company_id, employee_id])
  @@index([status])
  @@map("Goal")
}

enum GoalStatus {
  not_started
  in_progress
  completed
  cancelled
  deferred
}
```

### Template 3: Backend Service
```typescript
// lib/performance/goal-engine.ts

import prisma from '@/lib/prisma';
import { checkPlanFeature } from '@/lib/config/plan-checker';
import { getModuleConfig } from '@/lib/config/module-resolver';
import type { Goal, Prisma } from '@prisma/client';

export interface CreateGoalInput {
  companyId: string;
  employeeId: string;
  title: string;
  description?: string;
  targetValue?: number;
  dueDate: Date;
  createdBy: string;
}

export interface GoalEngineError {
  code: string;
  message: string;
  field?: string;
}

export async function createGoal(
  input: CreateGoalInput
): Promise<{ success: true; goal: Goal } | { success: false; error: GoalEngineError }> {
  // 1. Check plan feature
  const hasPerformance = await checkPlanFeature(input.companyId, 'performance_management');
  if (!hasPerformance) {
    return {
      success: false,
      error: {
        code: 'FEATURE_NOT_AVAILABLE',
        message: 'Performance management not included in your subscription plan'
      }
    };
  }
  
  // 2. Check module enabled
  const moduleConfig = await getModuleConfig(input.companyId, 'performance');
  if (!moduleConfig || !moduleConfig.enabled) {
    return {
      success: false,
      error: {
        code: 'MODULE_DISABLED',
        message: 'Performance management module is not enabled'
      }
    };
  }
  
  // 3. Validate input
  if (!input.title || input.title.length < 3) {
    return {
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Goal title must be at least 3 characters',
        field: 'title'
      }
    };
  }
  
  // 4. Create goal
  const goal = await prisma.goal.create({
    data: {
      company_id: input.companyId,
      employee_id: input.employeeId,
      title: input.title,
      description: input.description,
      target_value: input.targetValue,
      due_date: input.dueDate,
      created_by: input.createdBy,
      status: 'not_started'
    }
  });
  
  // 5. Audit log
  await prisma.auditLog.create({
    data: {
      company_id: input.companyId,
      user_id: input.createdBy,
      action: 'goal_created',
      entity_type: 'Goal',
      entity_id: goal.id,
      details: { title: goal.title }
    }
  });
  
  return { success: true, goal };
}

export async function getGoals(
  companyId: string,
  filters?: { employeeId?: string; status?: string }
): Promise<Goal[]> {
  return prisma.goal.findMany({
    where: {
      company_id: companyId, // ✅ Always filter by company
      ...(filters?.employeeId && { employee_id: filters.employeeId }),
      ...(filters?.status && { status: filters.status as any })
    },
    include: {
      employee: {
        select: {
          id: true,
          first_name: true,
          last_name: true,
          email: true
        }
      }
    },
    orderBy: { created_at: 'desc' }
  });
}
```

### Template 4: API Route
```typescript
// app/api/performance/goals/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { requireApiPermission } from '@/lib/api-permission-guard';
import { createGoal, getGoals } from '@/lib/performance/goal-engine';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const createGoalSchema = z.object({
  employeeId: z.string().uuid(),
  title: z.string().min(3).max(200),
  description: z.string().max(2000).optional(),
  targetValue: z.number().positive().optional(),
  dueDate: z.string().datetime()
});

// GET /api/performance/goals
export async function GET(request: NextRequest) {
  const authResult = await requireApiPermission(
    request,
    'performance.manage_goals'
  );
  
  if (authResult instanceof NextResponse) {
    return authResult; // Permission denied
  }
  
  const { employee } = authResult;
  const { searchParams } = new URL(request.url);
  
  const goals = await getGoals(employee.org_id, {
    employeeId: searchParams.get('employeeId') || undefined,
    status: searchParams.get('status') || undefined
  });
  
  return NextResponse.json({ goals });
}

// POST /api/performance/goals
export async function POST(request: NextRequest) {
  const authResult = await requireApiPermission(
    request,
    'performance.manage_goals'
  );
  
  if (authResult instanceof NextResponse) {
    return authResult;
  }
  
  const { employee } = authResult;
  
  try {
    const body = await request.json();
    const validated = createGoalSchema.parse(body);
    
    const result = await createGoal({
      companyId: employee.org_id,
      employeeId: validated.employeeId,
      title: validated.title,
      description: validated.description,
      targetValue: validated.targetValue,
      dueDate: new Date(validated.dueDate),
      createdBy: employee.id
    });
    
    if (!result.success) {
      return NextResponse.json(
        { error: result.error.message, code: result.error.code },
        { status: result.error.code === 'FEATURE_NOT_AVAILABLE' ? 402 : 400 }
      );
    }
    
    return NextResponse.json({ goal: result.goal }, { status: 201 });
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }
    
    console.error('Goal creation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

### Template 5: UI Page
```tsx
// app/(portals)/hr/(main)/performance/goals/page.tsx

import { Metadata } from 'next';
import { getAuthEmployee } from '@/lib/auth-guard';
import { checkPlanFeature } from '@/lib/config/plan-checker';
import { getGoals } from '@/lib/performance/goal-engine';
import { GoalList } from '@/components/performance/goal-list';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Goals - Continuum'
};

export default async function GoalsPage() {
  const employee = await getAuthEmployee();
  
  if (!employee) {
    redirect('/login');
  }
  
  // Check feature access
  const hasPerformance = await checkPlanFeature(
    employee.org_id,
    'performance_management'
  );
  
  if (!hasPerformance) {
    return (
      <div className="p-8 text-center">
        <h1 className="text-2xl font-bold mb-4">Performance Management</h1>
        <p className="text-gray-600 mb-6">
          This feature is not included in your current plan.
        </p>
        <Button asChild>
          <Link href="/admin/upgrade">Upgrade Plan</Link>
        </Button>
      </div>
    );
  }
  
  const goals = await getGoals(employee.org_id);
  
  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Goals</h1>
        <Button asChild>
          <Link href="/hr/performance/goals/new">
            <Plus className="mr-2 h-4 w-4" />
            Create Goal
          </Link>
        </Button>
      </div>
      
      <GoalList goals={goals} />
    </div>
  );
}
```

### Template 6: React Component
```tsx
// components/performance/goal-card.tsx

'use client';

import { Goal } from '@prisma/client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { format } from 'date-fns';

interface GoalCardProps {
  goal: Goal & {
    employee: {
      first_name: string;
      last_name: string;
    };
  };
  onClick?: () => void;
}

export function GoalCard({ goal, onClick }: GoalCardProps) {
  const progress = goal.target_value
    ? Math.min((Number(goal.current_value) / Number(goal.target_value)) * 100, 100)
    : 0;
  
  const statusColors = {
    not_started: 'bg-gray-500',
    in_progress: 'bg-blue-500',
    completed: 'bg-green-500',
    cancelled: 'bg-red-500',
    deferred: 'bg-yellow-500'
  };
  
  return (
    <Card 
      className="cursor-pointer hover:shadow-lg transition-shadow"
      onClick={onClick}
    >
      <CardHeader>
        <div className="flex justify-between items-start">
          <CardTitle className="text-lg">{goal.title}</CardTitle>
          <Badge className={statusColors[goal.status]}>
            {goal.status.replace('_', ' ')}
          </Badge>
        </div>
        <div className="text-sm text-gray-600">
          {goal.employee.first_name} {goal.employee.last_name}
        </div>
      </CardHeader>
      
      <CardContent>
        {goal.description && (
          <p className="text-sm text-gray-700 mb-4">
            {goal.description}
          </p>
        )}
        
        {goal.target_value && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Progress</span>
              <span className="font-medium">
                {goal.current_value}/{goal.target_value}
              </span>
            </div>
            <Progress value={progress} />
          </div>
        )}
        
        <div className="mt-4 text-sm text-gray-500">
          Due: {format(new Date(goal.due_date), 'MMM dd, yyyy')}
        </div>
      </CardContent>
    </Card>
  );
}
```

---

## 🧪 Testing Pattern

```typescript
// tests/performance/goal-engine.test.ts

import { describe, test, expect, beforeEach } from '@jest/globals';
import { createGoal } from '@/lib/performance/goal-engine';
import { createTestCompany, createTestEmployee } from '@/tests/helpers';

describe('Goal Engine', () => {
  let companyId: string;
  let employeeId: string;
  
  beforeEach(async () => {
    // Setup test data
    const company = await createTestCompany({ plan: 'growth' });
    const employee = await createTestEmployee({ companyId: company.id });
    
    companyId = company.id;
    employeeId = employee.id;
  });
  
  test('should create goal with valid data', async () => {
    const result = await createGoal({
      companyId,
      employeeId,
      title: 'Complete Q1 targets',
      dueDate: new Date('2026-03-31'),
      createdBy: employeeId
    });
    
    expect(result.success).toBe(true);
    expect(result.goal?.title).toBe('Complete Q1 targets');
  });
  
  test('should reject if plan does not include performance', async () => {
    const freeCompany = await createTestCompany({ plan: 'free' });
    
    const result = await createGoal({
      companyId: freeCompany.id,
      employeeId,
      title: 'Test goal',
      dueDate: new Date('2026-03-31'),
      createdBy: employeeId
    });
    
    expect(result.success).toBe(false);
    expect(result.error?.code).toBe('FEATURE_NOT_AVAILABLE');
  });
});
```

---

## 📝 Agent Task Checklist

When implementing a service, complete these steps in order:

### Phase 1: Research
- [ ] Read service spec in `COMPLETE_SOLUTION_MAPPING.md`
- [ ] Check existing code in `web/` directory
- [ ] Identify dependencies (other services/tables)
- [ ] Review similar existing implementations

### Phase 2: Database
- [ ] Create migration file (`npx prisma migrate dev --name [name]`)
- [ ] Add models to `schema.prisma`
- [ ] Add indexes for performance
- [ ] Add foreign keys with cascade rules
- [ ] Run `npx prisma generate`

### Phase 3: Backend
- [ ] Create service file in `lib/[module]/`
- [ ] Implement CRUD operations
- [ ] Add plan feature checks
- [ ] Add module config loading
- [ ] Add input validation
- [ ] Add error handling
- [ ] Add audit logging

### Phase 4: API
- [ ] Create route file in `app/api/[module]/route.ts`
- [ ] Add authentication check
- [ ] Add permission check
- [ ] Add plan check
- [ ] Add input validation (Zod)
- [ ] Call backend service
- [ ] Return standardized response
- [ ] Add error handling

### Phase 5: UI
- [ ] Create page in `app/(portals)/[portal]/(main)/[module]/page.tsx`
- [ ] Add plan feature check
- [ ] Add loading states
- [ ] Add empty states
- [ ] Add error handling
- [ ] Create components in `components/[module]/`
- [ ] Add form validation
- [ ] Add success/error toasts

### Phase 6: Testing
- [ ] Write unit tests for service
- [ ] Write integration tests for API
- [ ] Test with different plans (free, starter, growth, enterprise)
- [ ] Test with different roles (employee, manager, hr, admin)
- [ ] Test error scenarios
- [ ] Test race conditions
- [ ] Test multi-tenant isolation

### Phase 7: Documentation
- [ ] Add JSDoc comments to functions
- [ ] Create module documentation in `docs/modules/[module].md`
- [ ] Update API documentation
- [ ] Add setup guide for admins

---

## 🚨 Critical Reminders

### Security
- ✅ ALWAYS filter by `company_id`/`org_id`
- ✅ ALWAYS check authentication
- ✅ ALWAYS check permissions
- ✅ ALWAYS check plan features
- ✅ ALWAYS validate input (Zod)
- ✅ ALWAYS sanitize output
- ✅ ALWAYS use Prisma (never raw SQL)
- ✅ ALWAYS audit sensitive operations

### Performance
- ✅ Add database indexes
- ✅ Use SELECT only needed fields
- ✅ Paginate large lists
- ✅ Cache frequently accessed data
- ✅ Use React Server Components for data fetching
- ✅ Minimize client-side JavaScript

### UX
- ✅ Show loading states
- ✅ Show empty states
- ✅ Show error messages (user-friendly)
- ✅ Add contextual help (tooltips)
- ✅ Make forms accessible (ARIA labels)
- ✅ Support keyboard navigation
- ✅ Test on mobile devices

---

## 🎯 Success Criteria

Code is production-ready when:

1. ✅ All tests pass (unit + integration)
2. ✅ No TypeScript errors (`npm run build` succeeds)
3. ✅ No ESLint warnings (security rules passing)
4. ✅ Plan-based features work correctly
5. ✅ Multi-tenant isolation verified
6. ✅ Permission checks enforced
7. ✅ Configuration UI built
8. ✅ Documentation complete
9. ✅ Accessibility score >90 (Lighthouse)
10. ✅ Performance score >90 (Lighthouse)

---

## 📚 Quick Reference Links

- **Authentication**: `web/lib/auth-guard.ts`
- **Permissions**: `web/lib/rbac.ts`
- **Plan Checks**: `web/lib/config/plan-checker.ts`
- **Module Config**: `web/lib/config/module-resolver.ts`
- **Database**: `web/prisma/schema.prisma`
- **Examples**: `web/app/api/leaves/` (reference implementation)

---

**You are now equipped to build enterprise-grade HRMS features autonomously! 🤖**

When stuck, refer back to existing implementations in the `web/` directory - they follow these patterns consistently.
