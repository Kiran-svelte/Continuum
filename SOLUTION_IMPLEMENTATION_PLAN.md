# SOLUTION IMPLEMENTATION PLAN - Continuum HRMS
## Complete Resolution Mapping with Unique Identifiers

**Date**: 2026-06-30  
**Version**: 1.0  
**Cross-Reference**: CRITICAL_WORKFLOW_ISSUES_AUDIT.md

---

## ISSUE IDENTIFIER FORMAT

`[CAT]-[NUM]-[COMPONENT]`

- **CAT**: Category (SEC=Security, CORE=Core Module, INT=Integration, DATA=Data, UI=User Interface)
- **NUM**: Issue number (001-099)
- **COMPONENT**: Affected component type

Example: `SEC-001-CSP` = Security Issue #1, Content Security Policy

---

## TABLE OF CONTENTS

1. [Critical Security Issues](#critical-security-issues)
2. [Core Module Implementations](#core-module-implementations)
3. [Integration & Infrastructure](#integration--infrastructure)
4. [Data & Backend](#data--backend)
5. [User Interface & Experience](#user-interface--experience)
6. [Cross-Cutting Concerns](#cross-cutting-concerns)

---

# CRITICAL SECURITY ISSUES

## SEC-001: Content Security Policy Fix

**Priority**: 🔴 CRITICAL  
**Estimated Effort**: 2 days  
**Dependencies**: None

### Components to Modify

#### SEC-001-MIDDLEWARE
**File**: `web/middleware.ts` (Lines 248-270)

**Current Code**:
```typescript
const scriptSrc = nonce
  ? `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' https: http: 'unsafe-inline' 'unsafe-eval'`
  : "script-src 'self' 'unsafe-inline' 'unsafe-eval'";
```

**Solution**:
```typescript
const scriptSrc = nonce
  ? `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`
  : "script-src 'self' 'sha256-HASH1' 'sha256-HASH2'"; // Hash inline scripts

// Add specific domains
const allowedScriptDomains = [
  'https://static.cloudflareinsights.com',
  'https://va.vercel-scripts.com',
  'https://continuum.support'
].join(' ');

const cspDirective = [
  "default-src 'self'",
  scriptSrc + ' ' + allowedScriptDomains,
  "style-src 'self' 'unsafe-inline'", // Keep for Tailwind
  "img-src 'self' data: https:",
  "font-src 'self' data:",
  "connect-src 'self' https://api.openai.com https://upstash.io",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'"
].join('; ');

response.headers.set('Content-Security-Policy', cspDirective);
```

#### SEC-001-CONFIG
**File**: `web/next.config.ts` (New section)

**Add**:
```typescript
async headers() {
  return [
    {
      source: '/:path*',
      headers: [
        {
          key: 'Content-Security-Policy-Report-Only',
          value: process.env.CSP_REPORT_URI 
            ? `default-src 'self'; report-uri ${process.env.CSP_REPORT_URI}`
            : ''
        }
      ]
    }
  ]
}
```

#### SEC-001-ENV
**File**: `web/.env.example`

**Add**:
```bash
# CSP Configuration
CSP_REPORT_URI=https://your-sentry-endpoint/api/csp-reports
CSP_ALLOWED_SCRIPTS=https://static.cloudflareinsights.com,https://va.vercel-scripts.com
```

#### SEC-001-TEST
**New File**: `web/tests/security/csp.test.ts`

```typescript
import { describe, test, expect } from '@jest/globals';

describe('CSP Configuration', () => {
  test('should allow Next.js scripts with nonce', async () => {
    // Test implementation
  });
  
  test('should block unauthorized inline scripts', async () => {
    // Test implementation
  });
});
```

### Verification Checklist
- [ ] Browser console shows no CSP violations
- [ ] All icons load correctly (check /icons/*)
- [ ] Third-party analytics load (Cloudflare, Vercel)
- [ ] Dashboard renders without JS errors
- [ ] Test in Chrome, Firefox, Safari



---

## SEC-002: RBAC Permission Enforcement

**Priority**: 🟠 HIGH  
**Estimated Effort**: 5 days  
**Dependencies**: None

### Components to Modify

#### SEC-002-GUARD
**New File**: `web/lib/api-permission-guard.ts`

```typescript
import { getAuthEmployee } from '@/lib/auth-guard';
import { getUserPermissions } from '@/lib/rbac';
import { NextRequest, NextResponse } from 'next/server';
import type { PermissionCode } from '@/lib/rbac';

export async function requireApiPermission(
  request: NextRequest,
  requiredPermission: PermissionCode
): Promise<{ employee: Employee } | NextResponse> {
  const employee = await getAuthEmployee(request);
  
  if (!employee) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  const permissions = await getUserPermissions(employee.id, employee.org_id);
  
  if (!permissions.includes(requiredPermission) && !permissions.includes('*')) {
    // Audit failed permission check
    await prisma.auditLog.create({
      data: {
        company_id: employee.org_id,
        user_id: employee.id,
        action: 'permission_denied',
        entity_type: 'api_access',
        entity_id: request.url,
        details: { required: requiredPermission, route: request.nextUrl.pathname },
        ip_address: request.headers.get('x-forwarded-for') || 'unknown'
      }
    });
    
    return NextResponse.json({ 
      error: 'Forbidden', 
      required_permission: requiredPermission 
    }, { status: 403 });
  }
  
  return { employee };
}
```

#### SEC-002-API-PAYROLL
**File**: `web/app/api/payroll/route.ts`

**Modify**:
```typescript
import { requireApiPermission } from '@/lib/api-permission-guard';

export async function GET(request: NextRequest) {
  const authResult = await requireApiPermission(request, 'payroll.view_all');
  
  if (authResult instanceof NextResponse) {
    return authResult; // Permission denied
  }
  
  const { employee } = authResult;
  // Continue with logic...
}
```

#### SEC-002-API-HR
**Files to Update** (Add permission guards):
- `web/app/api/hr/settings/route.ts` → `company.edit_settings`
- `web/app/api/hr/policy/route.ts` → `company.manage_policies`
- `web/app/api/hr/adjust-balance/route.ts` → `leave.adjust_balance`
- `web/app/api/employees/[id]/route.ts` → `employee.edit_any`
- `web/app/api/attendance/override/route.ts` → `attendance.override`



#### SEC-002-MIDDLEWARE-MODULE
**File**: `web/middleware.ts` (Add module gating)

**Add after auth check**:
```typescript
// Module-level access control
const moduleSlug = moduleSlugForPortalPath(pathname);
if (moduleSlug && moduleSlug !== 'core') {
  const moduleState = await getCompanyModuleState(user.org_id, moduleSlug);
  
  if (!moduleState.enabled) {
    // Redirect to access denied page
    return NextResponse.redirect(
      new URL(`/access-denied?module=${moduleSlug}`, request.url)
    );
  }
}
```

#### SEC-002-UI-ACCESS-DENIED
**New File**: `web/app/(portals)/access-denied/page.tsx`

```tsx
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Access Denied - Continuum'
};

export default function AccessDeniedPage({
  searchParams
}: {
  searchParams: { module?: string; permission?: string }
}) {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">Access Denied</h1>
        {searchParams.module && (
          <p className="text-gray-600 mb-2">
            Module <strong>{searchParams.module}</strong> is not enabled for your organization.
          </p>
        )}
        {searchParams.permission && (
          <p className="text-gray-600 mb-2">
            You need <strong>{searchParams.permission}</strong> permission to access this resource.
          </p>
        )}
        <p className="text-sm text-gray-500 mt-4">
          Contact your administrator to request access.
        </p>
      </div>
    </div>
  );
}
```

#### SEC-002-TEST
**New File**: `web/tests/security/rbac-enforcement.test.ts`

```typescript
describe('RBAC Enforcement', () => {
  test('should deny access without permission', async () => {
    // Create employee with 'employee' role
    // Try to access /api/payroll
    // Expect 403
  });
  
  test('should allow access with wildcard permission', async () => {
    // Create admin with '*' permission
    // Access any route
    // Expect 200
  });
  
  test('should log failed permission checks', async () => {
    // Attempt unauthorized access
    // Verify AuditLog entry created
  });
});
```

### Verification Checklist
- [ ] All API routes have permission checks
- [ ] Module-disabled routes return 403/redirect
- [ ] Permission failures logged to audit trail
- [ ] Access denied page renders correctly
- [ ] Secondary roles merged correctly



---

## SEC-003: Environment Configuration Hardening

**Priority**: 🔴 CRITICAL  
**Estimated Effort**: 3 days  
**Dependencies**: None

### Components to Create

#### SEC-003-ENV-VALIDATOR
**New File**: `web/lib/env-validator.ts`

```typescript
import { z } from 'zod';

const envSchema = z.object({
  // Database
  DATABASE_URL: z.string().url(),
  DIRECT_URL: z.string().url().optional(),
  
  // Auth
  JWT_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  SESSION_SECRET: z.string().min(32),
  
  // Services
  CONSTRAINT_ENGINE_URL: z.string().url(),
  CONSTRAINT_ENGINE_FALLBACK_MODE: z.enum(['local', 'manual_review']).default('local'),
  
  // Storage
  STORAGE_PRIMARY: z.enum(['r2', 'appwrite']).default('r2'),
  CLOUDFLARE_R2_ACCESS_KEY_ID: z.string().optional(),
  APPWRITE_API_KEY: z.string().optional(),
  
  // Rate Limiting
  RATE_LIMIT_ANONYMOUS: z.coerce.number().default(100),
  RATE_LIMIT_AUTHENTICATED: z.coerce.number().default(1000),
  UPSTASH_REDIS_REST_URL: z.string().url(),
  UPSTASH_REDIS_REST_TOKEN: z.string(),
  
  // Monitoring
  SENTRY_DSN: z.string().url().optional(),
  GRAFANA_PUSH_URL: z.string().url().optional(),
  
  // Email
  SENDGRID_API_KEY: z.string().optional(),
  GMAIL_CLIENT_ID: z.string().optional(),
  
  // Notifications
  PUSHER_APP_ID: z.string(),
  PUSHER_KEY: z.string(),
  PUSHER_SECRET: z.string(),
  
  // WhatsApp
  WHATSAPP_WEBHOOK_SECRET: z.string().min(32),
  WHATSAPP_TOKEN_ENCRYPTION_KEY: z.string().min(32),
  
  // Node Environment
  NODE_ENV: z.enum(['development', 'production', 'test']),
  
  // Session
  SESSION_TIMEOUT_MINUTES: z.coerce.number().default(30),
});

export type ValidatedEnv = z.infer<typeof envSchema>;

export function validateEnv(): ValidatedEnv {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('❌ Environment validation failed:');
      error.errors.forEach((err) => {
        console.error(`  - ${err.path.join('.')}: ${err.message}`);
      });
      throw new Error('Invalid environment configuration');
    }
    throw error;
  }
}

// Validate on module load
export const env = validateEnv();
```



#### SEC-003-ENV-EXAMPLE
**File**: `web/.env.example` (Complete version)

```bash
# ===================================
# DATABASE CONFIGURATION (REQUIRED)
# ===================================
DATABASE_URL="postgresql://user:password@localhost:5432/continuum"
DIRECT_URL="postgresql://user:password@localhost:5432/continuum" # For migrations

# ===================================
# AUTHENTICATION (REQUIRED)
# ===================================
JWT_SECRET="generate_with_openssl_rand_base64_32"
JWT_REFRESH_SECRET="generate_with_openssl_rand_base64_32"
SESSION_SECRET="generate_with_openssl_rand_base64_32"
SESSION_TIMEOUT_MINUTES=30

# ===================================
# CONSTRAINT ENGINE (REQUIRED)
# ===================================
CONSTRAINT_ENGINE_URL="https://constraint-engine.your-domain.com"
CONSTRAINT_ENGINE_FALLBACK_MODE="local" # local | manual_review

# ===================================
# STORAGE CONFIGURATION (REQUIRED)
# ===================================
STORAGE_PRIMARY="r2" # r2 | appwrite

# Cloudflare R2 (if STORAGE_PRIMARY=r2)
CLOUDFLARE_R2_ACCESS_KEY_ID="your_r2_access_key"
CLOUDFLARE_R2_SECRET_ACCESS_KEY="your_r2_secret"
CLOUDFLARE_R2_BUCKET_NAME="continuum-uploads"
CLOUDFLARE_R2_ACCOUNT_ID="your_account_id"

# Appwrite (if STORAGE_PRIMARY=appwrite OR as fallback)
APPWRITE_ENDPOINT="https://cloud.appwrite.io/v1"
APPWRITE_PROJECT_ID="your_project_id"
APPWRITE_API_KEY="your_api_key"
APPWRITE_BUCKET_ID="continuum-files"

# ===================================
# RATE LIMITING (REQUIRED)
# ===================================
RATE_LIMIT_ANONYMOUS=100 # requests per hour
RATE_LIMIT_AUTHENTICATED=1000 # requests per hour
UPSTASH_REDIS_REST_URL="https://your-redis.upstash.io"
UPSTASH_REDIS_REST_TOKEN="your_redis_token"

# ===================================
# MONITORING & OBSERVABILITY
# ===================================
SENTRY_DSN="https://your-sentry-dsn@sentry.io/project-id"
SENTRY_AUTH_TOKEN="your_sentry_auth_token"
GRAFANA_PUSH_URL="https://your-grafana-cloud.grafana.net/api/prom/push"
LOKI_URL="https://your-loki-endpoint.grafana.net"

# ===================================
# EMAIL SERVICES
# ===================================
# SendGrid (Primary)
SENDGRID_API_KEY="SG.your_sendgrid_api_key"
SENDGRID_FROM_EMAIL="noreply@continuum.support"

# Gmail OAuth2 (Fallback)
GMAIL_CLIENT_ID="your_gmail_client_id"
GMAIL_CLIENT_SECRET="your_gmail_client_secret"
GMAIL_REFRESH_TOKEN="your_gmail_refresh_token"
GMAIL_FROM_EMAIL="hr@your-company.com"

# ===================================
# REAL-TIME NOTIFICATIONS (REQUIRED)
# ===================================
PUSHER_APP_ID="your_pusher_app_id"
PUSHER_KEY="your_pusher_key"
PUSHER_SECRET="your_pusher_secret"
PUSHER_CLUSTER="ap2"

# ===================================
# WHATSAPP INTEGRATION
# ===================================
WHATSAPP_WEBHOOK_SECRET="generate_with_openssl_rand_base64_32"
WHATSAPP_VERIFY_TOKEN="your_meta_verify_token"
WHATSAPP_TOKEN_ENCRYPTION_KEY="generate_with_openssl_rand_base64_32"

# ===================================
# AI SERVICES
# ===================================
OPENAI_API_KEY="sk-your_openai_api_key"
OPENAI_MODEL="gpt-4-turbo-preview"

# ===================================
# PAYMENT GATEWAYS
# ===================================
RAZORPAY_KEY_ID="rzp_test_your_key_id"
RAZORPAY_KEY_SECRET="your_razorpay_secret"
RAZORPAY_WEBHOOK_SECRET="your_webhook_secret"

# ===================================
# APPLICATION SETTINGS
# ===================================
NODE_ENV="production" # development | production | test
NEXT_PUBLIC_APP_URL="https://your-domain.com"
APP_URL="https://your-domain.com"

# ===================================
# CSP CONFIGURATION
# ===================================
CSP_REPORT_URI="https://your-sentry-endpoint/api/csp-reports"
CSP_ALLOWED_SCRIPTS="https://static.cloudflareinsights.com,https://va.vercel-scripts.com"

# ===================================
# BACKUP & DISASTER RECOVERY
# ===================================
BACKUP_ENABLED="true"
BACKUP_RETENTION_DAYS="90"
BACKUP_ENCRYPTION_KEY="generate_with_openssl_rand_base64_32"
BACKUP_S3_BUCKET="continuum-backups"
BACKUP_S3_REGION="us-east-1"
```

#### SEC-003-STARTUP
**File**: `web/lib/startup-checks.ts`

```typescript
import { env } from '@/lib/env-validator';
import prisma from '@/lib/prisma';
import { Redis } from '@upstash/redis';

export async function runStartupChecks() {
  const checks = [
    checkDatabase(),
    checkRedis(),
    checkStorage(),
    checkConstraintEngine(),
  ];
  
  const results = await Promise.allSettled(checks);
  
  const failures = results.filter((r) => r.status === 'rejected');
  
  if (failures.length > 0) {
    console.error('❌ Startup checks failed:');
    failures.forEach((f, i) => {
      console.error(`  ${i + 1}. ${(f as PromiseRejectedResult).reason}`);
    });
    
    if (env.NODE_ENV === 'production') {
      throw new Error('Critical services unavailable');
    }
  } else {
    console.log('✅ All startup checks passed');
  }
}

async function checkDatabase() {
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch (error) {
    throw new Error('Database connection failed');
  }
}

async function checkRedis() {
  try {
    const redis = new Redis({
      url: env.UPSTASH_REDIS_REST_URL,
      token: env.UPSTASH_REDIS_REST_TOKEN,
    });
    await redis.ping();
  } catch (error) {
    throw new Error('Redis connection failed');
  }
}

async function checkStorage() {
  // Check primary storage availability
  if (env.STORAGE_PRIMARY === 'r2' && !env.CLOUDFLARE_R2_ACCESS_KEY_ID) {
    throw new Error('R2 configured but credentials missing');
  }
  if (env.STORAGE_PRIMARY === 'appwrite' && !env.APPWRITE_API_KEY) {
    throw new Error('Appwrite configured but credentials missing');
  }
}

async function checkConstraintEngine() {
  try {
    const response = await fetch(`${env.CONSTRAINT_ENGINE_URL}/health`, {
      method: 'GET',
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) {
      throw new Error(`Constraint engine returned ${response.status}`);
    }
  } catch (error) {
    if (env.CONSTRAINT_ENGINE_FALLBACK_MODE !== 'local') {
      throw new Error('Constraint engine unavailable and no fallback configured');
    }
    console.warn('⚠️  Constraint engine unavailable - using local fallback');
  }
}
```

#### SEC-003-SERVER
**File**: `web/server.ts` or add to `instrumentation.ts`

```typescript
import { runStartupChecks } from '@/lib/startup-checks';

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await runStartupChecks();
  }
}
```

### Verification Checklist
- [ ] App fails to start with missing env vars
- [ ] All env vars documented in .env.example
- [ ] Startup health checks pass
- [ ] Fallback modes work correctly
- [ ] Environment-specific configs load properly

---

# CORE MODULE IMPLEMENTATIONS

## CORE-001: Performance Management Module

**Priority**: 🔴 CRITICAL  
**Estimated Effort**: 20 days  
**Dependencies**: SEC-002 (RBAC)

### Database Schema

#### CORE-001-DB-SCHEMA
**File**: `web/prisma/schema.prisma` (Verify existing models)

```prisma
// ✅ Already exists - verify completeness

model Goal {
  id               String       @id @default(uuid())
  company_id       String
  employee_id      String
  category         GoalCategory // company | department | team | individual
  title            String
  description      String       @db.Text
  metric_type      MetricType   // percentage | number | currency | boolean
  target_value     Decimal?     @db.Decimal(12, 2)
  current_value    Decimal?     @db.Decimal(12, 2)
  weight           Int          @default(100) // Weight in overall evaluation
  status           GoalStatus   // not_started | in_progress | completed | cancelled
  start_date       DateTime
  due_date         DateTime
  parent_goal_id   String?
  created_by       String
  created_at       DateTime     @default(now())
  updated_at       DateTime     @updatedAt
  
  company          Company      @relation(fields: [company_id], references: [id])
  employee         Employee     @relation(fields: [employee_id], references: [id])
  parent_goal      Goal?        @relation("GoalHierarchy", fields: [parent_goal_id], references: [id])
  child_goals      Goal[]       @relation("GoalHierarchy")
  
  @@index([company_id, employee_id])
  @@index([status, due_date])
}

model ReviewCycle {
  id               String              @id @default(uuid())
  company_id       String
  name             String
  cycle_type       ReviewCycleType     // quarterly | half_yearly | annual | custom
  status           ReviewCycleStatus   // draft | active | self_review | manager_review | calibration | completed
  start_date       DateTime
  end_date         DateTime
  self_review_deadline     DateTime?
  manager_review_deadline  DateTime?
  calibration_deadline     DateTime?
  created_by       String
  created_at       DateTime            @default(now())
  updated_at       DateTime            @updatedAt
  
  company          Company             @relation(fields: [company_id], references: [id])
  instances        ReviewInstance[]
  
  @@index([company_id, status])
}

model ReviewInstance {
  id               String              @id @default(uuid())
  cycle_id         String
  employee_id      String
  reviewer_id      String?
  review_type      ReviewType          // self | manager | peer | direct_report | skip_level
  status           ReviewInstanceStatus // pending | in_progress | submitted | acknowledged
  rating           Int?                // 1-5 scale
  comments         String?             @db.Text
  strengths        String?             @db.Text
  areas_for_improvement String?        @db.Text
  submitted_at     DateTime?
  acknowledged_at  DateTime?
  created_at       DateTime            @default(now())
  updated_at       DateTime            @updatedAt
  
  cycle            ReviewCycle         @relation(fields: [cycle_id], references: [id])
  employee         Employee            @relation("ReviewSubject", fields: [employee_id], references: [id])
  reviewer         Employee?           @relation("ReviewReviewer", fields: [reviewer_id], references: [id])
  comments_list    PerformanceReviewComment[]
  
  @@index([cycle_id, employee_id])
  @@index([reviewer_id, status])
}

model PerformanceReviewComment {
  id               String         @id @default(uuid())
  review_instance_id String
  commenter_id     String
  comment          String         @db.Text
  is_private       Boolean        @default(false) // Private to HR only
  created_at       DateTime       @default(now())
  
  review_instance  ReviewInstance @relation(fields: [review_instance_id], references: [id])
  commenter        Employee       @relation(fields: [commenter_id], references: [id])
  
  @@index([review_instance_id])
}
```

