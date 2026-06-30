# RALPH Loop System
## Resilient Autonomous Loop for Production-grade Handling

**Version**: 1.0.0  
**Target**: >90% completion for all 64 services with verified production readiness  
**Mode**: Autonomous operation with self-correction and progress tracking

---

## 🎯 Mission Statement

The RALPH loop is an autonomous AI agent execution system that:
1. Works continuously until ALL services reach >90% completion
2. Verifies production readiness (reliable, scalable, secure)
3. Self-corrects when encountering failures
4. Provides proof of completion at each milestone
5. Only exits when perfect results are achieved OR maximum safe iterations reached

**Exit Criteria**: Services at >90% completion with passing tests, security checks, and performance benchmarks.

---

## 🔄 Loop Architecture

### Loop State Machine

```
┌─────────────────────────────────────────────────────┐
│                  RALPH LOOP START                    │
│            Load State | Initialize Tracking          │
└────────────────┬────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────┐
│  PHASE 1: ANALYZE                                    │
│  • Read progress state                               │
│  • Identify next incomplete service                  │
│  • Load service spec from COMPLETE_SOLUTION_MAPPING  │
│  • Check dependencies                                │
└────────────────┬────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────┐
│  PHASE 2: PLAN                                       │
│  • Break service into tasks                          │
│  • Estimate effort                                   │
│  • Create implementation checklist                   │
│  • Identify required files                           │
└────────────────┬────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────┐
│  PHASE 3: IMPLEMENT                                  │
│  • Create database migrations                        │
│  • Update Prisma schema                              │
│  • Build backend service                             │
│  • Create API routes                                 │
│  • Build UI pages and components                     │
└────────────────┬────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────┐
│  PHASE 4: TEST                                       │
│  • Run TypeScript compiler                           │
│  • Run unit tests                                    │
│  • Run integration tests                             │
│  • Check security (auth, permissions, tenant)        │
│  • Check performance                                 │
└────────────────┬────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────┐
│  PHASE 5: VERIFY                                     │
│  • Validate against success criteria                 │
│  • Run production readiness checklist                │
│  • Generate proof report                             │
│  • Calculate completion percentage                   │
└────────────────┬────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────┐
│  PHASE 6: CORRECT (if failures detected)             │
│  • Analyze failure logs                              │
│  • Identify root cause                               │
│  • Generate fix strategy                             │
│  • Apply corrections                                 │
│  • Return to PHASE 3                                 │
└────────────────┬────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────┐
│  PHASE 7: RECORD                                     │
│  • Update progress state                             │
│  • Save proof of completion                          │
│  • Update completion metrics                         │
│  • Generate progress report                          │
└────────────────┬────────────────────────────────────┘
                 │
                 ▼
          ┌──────────────┐
          │  CHECK EXIT  │
          │  CRITERIA?   │
          └──────┬───────┘
                 │
         ┌───────┴────────┐
         │                │
    YES  │                │ NO
         │                │
         ▼                ▼
  ┌──────────┐    ┌──────────────┐
  │   EXIT   │    │ NEXT SERVICE │
  │ SUCCESS  │    │ Return to    │
  └──────────┘    │ PHASE 1      │
                  └──────────────┘
```

---

## 📋 Phase Details

### PHASE 1: ANALYZE

**Purpose**: Understand current state and select next work item

**Tasks**:
1. Read `LOOP_STATE.json` (progress tracking file)
2. Identify services with completion <90%
3. Select highest priority service (by dependency order)
4. Load service specification from `COMPLETE_SOLUTION_MAPPING.md`
5. Check if dependencies are complete
6. Read existing codebase for the service

**Output**: Work package with service details and context

**Files Read**:
- `LOOP_STATE.json`
- `COMPLETE_SOLUTION_MAPPING.md`
- `COMPLETE_SERVICES_SUMMARY.md`
- Existing service files in `web/`

---

### PHASE 2: PLAN

**Purpose**: Create detailed implementation plan

**Tasks**:
1. Break service into atomic tasks
2. Create task checklist following `agents.md` template
3. Identify all files to create/modify
4. Plan database changes (migrations, schema updates)
5. Plan API routes
6. Plan UI pages and components
7. Estimate effort (1-5 complexity score)

**Output**: Implementation plan with file-level details

**Checklist Template**:
```markdown
## Implementation Plan: [Service Name] ([SERVICE-ID])

### Database Layer
- [ ] Create migration: `YYYYMMDDHHMMSS_add_[feature].sql`
- [ ] Update `schema.prisma` with models
- [ ] Add indexes for performance
- [ ] Add foreign keys with cascade rules

### Backend Layer
- [ ] Create service: `lib/[module]/[service]-engine.ts`
- [ ] Implement CRUD operations
- [ ] Add plan feature checks
- [ ] Add module config loading
- [ ] Add input validation
- [ ] Add error handling
- [ ] Add audit logging

### API Layer
- [ ] Create routes: `app/api/[module]/route.ts`
- [ ] Add authentication
- [ ] Add authorization (permissions)
- [ ] Add plan checks
- [ ] Add input validation (Zod)
- [ ] Add error handling

### UI Layer
- [ ] Create page: `app/(portals)/[portal]/(main)/[module]/page.tsx`
- [ ] Add plan feature check
- [ ] Add loading states
- [ ] Add empty states
- [ ] Create components: `components/[module]/`
- [ ] Add form validation

### Testing Layer
- [ ] Unit tests for service
- [ ] Integration tests for API
- [ ] Test with different plans
- [ ] Test with different roles
- [ ] Test error scenarios
```

---

### PHASE 3: IMPLEMENT

**Purpose**: Write production-ready code

**Tasks**:
1. **Database**: Create migrations and update Prisma schema
2. **Backend**: Implement service following templates in `agents.md`
3. **API**: Create routes with full security stack
4. **UI**: Build pages and components with UX guidelines
5. **Config**: Add module configuration UI
6. **Docs**: Add inline comments and documentation

**Critical Rules** (from `agents.md`):
- ✅ ALWAYS filter by `company_id`/`org_id` (multi-tenant)
- ✅ ALWAYS check authentication
- ✅ ALWAYS check permissions (RBAC)
- ✅ ALWAYS check plan features
- ✅ ALWAYS validate input (Zod)
- ✅ ALWAYS add audit logs for sensitive operations
- ✅ NEVER hardcode business rules (configuration-driven)
- ✅ NEVER use raw SQL (use Prisma only)

**Code Quality Standards**:
- TypeScript strict mode (no `any` types)
- ESLint passing (security rules enforced)
- All functions have JSDoc comments
- Error messages are user-friendly
- UI is accessible (ARIA labels, keyboard nav)

**Output**: Complete implementation files

---

### PHASE 4: TEST

**Purpose**: Verify implementation quality and correctness

**Test Suite**:

#### 1. TypeScript Compilation
```bash
cd web
npm run build
```
**Pass Criteria**: Zero TypeScript errors

#### 2. ESLint Security
```bash
npm run lint
```
**Pass Criteria**: Zero security warnings

#### 3. Unit Tests
```bash
npm run test -- [service-name]
```
**Pass Criteria**: 100% pass rate, >80% coverage

#### 4. Integration Tests
```bash
npm run test:integration -- [module-name]
```
**Pass Criteria**: All API endpoints working

#### 5. Security Tests
**Manual Verification**:
- [ ] Multi-tenant isolation (can't access other company data)
- [ ] Authentication required on all routes
- [ ] Permission checks enforced
- [ ] Plan features gated correctly
- [ ] Input validation prevents injection
- [ ] No sensitive data in logs/responses

#### 6. Performance Tests
**Benchmarks**:
- [ ] Page load <2 seconds
- [ ] API response <500ms (P95)
- [ ] Database queries optimized (indexed)
- [ ] No N+1 query issues
- [ ] Lighthouse Performance >90

#### 7. Accessibility Tests
**Benchmarks**:
- [ ] Lighthouse Accessibility >90
- [ ] Keyboard navigation works
- [ ] Screen reader compatible
- [ ] ARIA labels present
- [ ] Color contrast WCAG AA

**Output**: Test results report

---

### PHASE 5: VERIFY

**Purpose**: Generate proof of production readiness

**Verification Checklist**:

#### Production Readiness Criteria
1. **Functionality** (20 points)
   - [ ] All CRUD operations work (5 pts)
   - [ ] Error handling complete (5 pts)
   - [ ] Edge cases handled (5 pts)
   - [ ] Configuration UI built (5 pts)

2. **Security** (25 points)
   - [ ] Authentication enforced (5 pts)
   - [ ] Authorization enforced (5 pts)
   - [ ] Multi-tenant isolation verified (5 pts)
   - [ ] Input validation complete (5 pts)
   - [ ] No SQL injection vulnerabilities (5 pts)

3. **Reliability** (20 points)
   - [ ] Database transactions used (5 pts)
   - [ ] Optimistic locking on updates (5 pts)
   - [ ] Graceful error handling (5 pts)
   - [ ] Audit logging complete (5 pts)

4. **Scalability** (15 points)
   - [ ] Database indexes added (5 pts)
   - [ ] Queries optimized (5 pts)
   - [ ] Pagination implemented (5 pts)

5. **User Experience** (10 points)
   - [ ] Loading states present (2 pts)
   - [ ] Empty states present (2 pts)
   - [ ] Error messages clear (2 pts)
   - [ ] Forms validated (2 pts)
   - [ ] Responsive design (2 pts)

6. **Code Quality** (10 points)
   - [ ] TypeScript strict mode (2 pts)
   - [ ] ESLint passing (2 pts)
   - [ ] JSDoc comments (2 pts)
   - [ ] No code duplication (2 pts)
   - [ ] Follows project patterns (2 pts)

**Total Score**: 100 points  
**Minimum Required**: 90 points (>90% completion)

**Output**: Verification report with score

---

### PHASE 6: CORRECT

**Purpose**: Fix failures and improve quality

**Triggered When**: Any test fails or verification score <90

**Correction Strategy**:

#### 1. Analyze Failure
```typescript
interface Failure {
  phase: 'test' | 'verify';
  category: 'functionality' | 'security' | 'performance' | 'quality';
  severity: 'critical' | 'major' | 'minor';
  description: string;
  location: string; // file:line
}
```

#### 2. Identify Root Cause
- Read error logs
- Inspect failing code
- Check related dependencies
- Review similar working code

#### 3. Generate Fix Strategy
```markdown
## Fix Plan

**Failure**: [Description]
**Root Cause**: [Analysis]
**Solution**: [Approach]

### Changes Required:
- [ ] File 1: [Change description]
- [ ] File 2: [Change description]

### Risk Assessment:
- Breaking changes: Yes/No
- Affects other services: Yes/No
- Requires migration: Yes/No
```

#### 4. Apply Fix
- Implement corrections
- Add regression test
- Re-run full test suite
- Verify fix resolves issue

#### 5. Maximum Retry Logic
```typescript
const MAX_RETRY_PER_SERVICE = 3;
const MAX_RETRY_PER_FAILURE = 2;

if (retryCount >= MAX_RETRY_PER_SERVICE) {
  // Mark service as "BLOCKED"
  // Document issue in BLOCKED_SERVICES.md
  // Move to next service
  // Return to this service later
}
```

**Output**: Fixed implementation + retry count

---

### PHASE 7: RECORD

**Purpose**: Track progress and maintain state

**State File Structure**: `LOOP_STATE.json`
```json
{
  "version": "1.0.0",
  "lastUpdated": "2026-06-30T10:30:00Z",
  "iteration": 42,
  "overallCompletion": 67.5,
  "services": [
    {
      "id": "CORE-001",
      "name": "Organization Structure",
      "category": "core",
      "status": "completed",
      "completionScore": 95,
      "lastAttempt": "2026-06-28T14:20:00Z",
      "attemptsCount": 1,
      "testsPassed": true,
      "verificationPassed": true,
      "proofFile": "proofs/CORE-001-proof.md"
    },
    {
      "id": "PERF-001",
      "name": "Goal Management",
      "category": "performance",
      "status": "in_progress",
      "completionScore": 75,
      "lastAttempt": "2026-06-30T10:15:00Z",
      "attemptsCount": 2,
      "testsPassed": true,
      "verificationPassed": false,
      "issues": [
        "Accessibility score: 85 (needs 90+)"
      ]
    },
    {
      "id": "LMS-001",
      "name": "Course Management",
      "category": "lms",
      "status": "pending",
      "completionScore": 0,
      "attemptsCount": 0
    }
  ],
  "blockedServices": [],
  "statistics": {
    "totalServices": 64,
    "completed": 32,
    "inProgress": 5,
    "pending": 25,
    "blocked": 2
  }
}
```

**Proof File Structure**: `proofs/[SERVICE-ID]-proof.md`
```markdown
# Production Readiness Proof: [Service Name]

**Service ID**: [SERVICE-ID]  
**Completion Date**: 2026-06-28  
**Final Score**: 95/100

## Implementation Summary
- Files created: 12
- Lines of code: 1,847
- Tests written: 23 (100% passing)
- Attempts required: 1

## Test Results
✅ TypeScript compilation: PASS  
✅ ESLint security: PASS  
✅ Unit tests: 23/23 PASS (87% coverage)  
✅ Integration tests: 8/8 PASS  
✅ Security checks: ALL PASS  
✅ Performance: P95 < 500ms ✓  
✅ Accessibility: Lighthouse 94 ✓

## Verification Checklist
- Functionality: 20/20 ✓
- Security: 25/25 ✓
- Reliability: 20/20 ✓
- Scalability: 15/15 ✓
- User Experience: 10/10 ✓
- Code Quality: 5/10 (JSDoc incomplete)

## Production Deployment
- Database migration applied: ✓
- API routes deployed: ✓
- UI components deployed: ✓
- Configuration UI accessible: ✓

## Sign-off
Agent: RALPH v1.0.0  
Timestamp: 2026-06-28T14:20:00Z  
Status: PRODUCTION READY ✓
```

**Output**: Updated state files + proof document

---

## 🚦 Exit Criteria

### Success Exit (Goal Achieved)
```typescript
function checkSuccessExit(state: LoopState): boolean {
  const allServicesAbove90 = state.services.every(
    service => service.completionScore >= 90
  );
  
  const allTestsPassing = state.services.every(
    service => service.testsPassed === true
  );
  
  const allVerified = state.services.every(
    service => service.verificationPassed === true
  );
  
  return allServicesAbove90 && allTestsPassing && allVerified;
}
```

**Final Report**: `RALPH_COMPLETION_REPORT.md`

### Safety Exit (Maximum Iterations)
```typescript
const MAX_ITERATIONS = 500; // Safety limit
const MAX_BLOCKED_SERVICES = 10; // Too many failures

function checkSafetyExit(state: LoopState): boolean {
  return (
    state.iteration >= MAX_ITERATIONS ||
    state.blockedServices.length >= MAX_BLOCKED_SERVICES
  );
}
```

**Fallback Report**: `RALPH_PROGRESS_REPORT.md` (current state)

---

## 🔧 Configuration

### Loop Parameters

```json
{
  "ralph_config": {
    "max_iterations": 500,
    "max_retry_per_service": 3,
    "max_retry_per_failure": 2,
    "max_blocked_services": 10,
    "completion_threshold": 90,
    "parallel_services": 1,
    "auto_commit": true,
    "auto_deploy": false,
    "verbose_logging": true,
    "proof_generation": true,
    "state_persistence": "LOOP_STATE.json",
    "proof_directory": "proofs/",
    "priority_order": "dependency_first"
  }
}
```

### Service Priority Order

**Dependency-First Strategy**:
1. Core services (foundation)
2. Employee services (user management)
3. Time & Attendance (basic operations)
4. Leave Management (workflows)
5. Payroll (complex calculations)
6. Performance Management (advanced features)
7. Learning & Development (content-heavy)
8. Recruitment (external-facing)
9. Compensation & Benefits (plan-dependent)
10. Reports & Analytics (data aggregation)

---

## 🛡️ Safety Mechanisms

### 1. State Persistence
- Save state after EVERY service completion
- Auto-recover from interruptions
- Resume from last successful checkpoint

### 2. Rollback Capability
```typescript
async function rollbackService(serviceId: string) {
  // Revert database migrations
  await prisma.$executeRaw`
    -- Rollback migration for ${serviceId}
  `;
  
  // Restore previous file versions (git)
  await exec(`git restore [affected-files]`);
  
  // Update state
  state.services[serviceId].status = 'pending';
  state.services[serviceId].completionScore = 0;
}
```

### 3. Validation Gates
- TypeScript compilation MUST pass before moving forward
- Security tests MUST pass (no exceptions)
- Multi-tenant isolation MUST be verified
- Plan feature gating MUST work

### 4. Quality Thresholds
- Unit test coverage: >80%
- Integration tests: 100% pass rate
- Lighthouse Performance: >90
- Lighthouse Accessibility: >90
- ESLint: Zero security warnings

### 5. Failure Isolation
- Failure in one service doesn't block others
- Mark problematic services as "BLOCKED"
- Document blockers for human review
- Continue with remaining services

---

## 📊 Progress Reporting

### Real-Time Dashboard (Console Output)

```
╔═══════════════════════════════════════════════════════════════╗
║              RALPH Loop - Progress Dashboard                  ║
╠═══════════════════════════════════════════════════════════════╣
║ Iteration: 42 / 500                                           ║
║ Overall Completion: 67.5% ████████████▒▒▒▒▒▒                  ║
║                                                               ║
║ Services Status:                                              ║
║   ✅ Completed: 32 / 64 (50.0%)                               ║
║   🔄 In Progress: 5                                           ║
║   ⏳ Pending: 25                                              ║
║   🚫 Blocked: 2                                               ║
║                                                               ║
║ Current Service: PERF-001 (Goal Management)                   ║
║ Phase: VERIFY                                                 ║
║ Score: 85/100 (needs improvement)                             ║
║                                                               ║
║ Last 3 Completions:                                           ║
║   ✅ CORE-005 (Role Management) - 95/100                      ║
║   ✅ ATT-002 (Shift Scheduling) - 92/100                      ║
║   ✅ LEAVE-003 (Approval Workflow) - 94/100                   ║
║                                                               ║
║ Estimated Time Remaining: 12 hours                            ║
╚═══════════════════════════════════════════════════════════════╝
```

### Milestone Reports

**Generated at**:
- 25% completion
- 50% completion
- 75% completion
- 90% completion
- 100% completion

**Content**:
- Services completed since last milestone
- Average completion score
- Common issues encountered
- Performance metrics
- Estimated completion time

---

## 🚀 Execution Instructions

### For AI Agents (Autonomous Mode)

**Step 1: Initialize**
```bash
# Create state directory
mkdir -p proofs
mkdir -p reports

# Initialize state file
echo '{"version":"1.0.0","iteration":0,"services":[]}' > LOOP_STATE.json

# Load configuration
cat RALPH_CONFIG.json
```

**Step 2: Start Loop**
```typescript
async function startRalphLoop() {
  console.log('🤖 RALPH Loop Starting...');
  
  // Load state
  const state = await loadState('LOOP_STATE.json');
  const config = await loadConfig('RALPH_CONFIG.json');
  
  while (!checkExitCriteria(state)) {
    state.iteration++;
    
    try {
      // PHASE 1: ANALYZE
      const workPackage = await analyzeNextService(state);
      console.log(`\n📋 Working on: ${workPackage.name} (${workPackage.id})`);
      
      // PHASE 2: PLAN
      const plan = await createImplementationPlan(workPackage);
      console.log(`✏️ Plan created: ${plan.tasks.length} tasks`);
      
      // PHASE 3: IMPLEMENT
      const implementation = await implementService(plan);
      console.log(`💻 Implementation complete: ${implementation.filesCreated.length} files`);
      
      // PHASE 4: TEST
      const testResults = await runTests(implementation);
      console.log(`🧪 Tests: ${testResults.passed}/${testResults.total} passed`);
      
      if (!testResults.allPassed) {
        // PHASE 6: CORRECT
        await correctFailures(testResults, implementation);
        continue; // Retry
      }
      
      // PHASE 5: VERIFY
      const verification = await verifyProductionReadiness(implementation);
      console.log(`✅ Verification score: ${verification.score}/100`);
      
      if (verification.score < config.completion_threshold) {
        // PHASE 6: CORRECT
        await improveQuality(verification, implementation);
        continue; // Retry
      }
      
      // PHASE 7: RECORD
      await recordCompletion(state, workPackage, verification);
      await generateProof(workPackage, verification);
      console.log(`🎉 Service completed: ${workPackage.name}`);
      
      // Save state
      await saveState(state);
      
    } catch (error) {
      console.error(`❌ Error in iteration ${state.iteration}:`, error);
      await handleError(state, error);
    }
  }
  
  // Generate final report
  await generateFinalReport(state);
  console.log('\n🏁 RALPH Loop Complete!');
}
```

**Step 3: Monitor Progress**
```

Check progress:
```bash
cat LOOP_STATE.json
cat reports/progress-report.md
```

**Step 4: View Proof**
```bash
ls proofs/
cat proofs/CORE-001-proof.md
```

---

### For Human Developers (Manual Mode)

**Step 1: Review Current State**
```bash
# Check completion status
cat LOOP_STATE.json

# Review blocked services (if any)
cat BLOCKED_SERVICES.md
```

**Step 2: Pick Next Service**
```typescript
// Find lowest completion service with no blockers
const nextService = services
  .filter(s => s.completionScore < 90 && !s.blocked)
  .sort((a, b) => a.priority - b.priority)[0];
```

**Step 3: Follow Agent Workflow**
Use `agents.md` templates and `prompt.md` guidelines

**Step 4: Update State**
After completing service, update `LOOP_STATE.json`:
```json
{
  "id": "PERF-001",
  "status": "completed",
  "completionScore": 95,
  "testsPassed": true,
  "verificationPassed": true,
  "proofFile": "proofs/PERF-001-proof.md"
}
```

---

## 🎯 Success Metrics

### Service-Level Metrics

**Target**: Each service achieves:
- Completion score: ≥90/100
- Test pass rate: 100%
- Security checks: ALL PASS
- Performance benchmarks: MET
- Accessibility score: ≥90

### System-Level Metrics

**Target**: Overall system achieves:
- All 64 services: ≥90% completion
- Zero critical security issues
- Zero breaking changes to existing features
- Lighthouse Performance: ≥90 (average)
- Lighthouse Accessibility: ≥90 (average)
- Build time: <5 minutes
- Test suite execution: <10 minutes

### Quality Metrics

**Code Coverage**:
- Unit tests: >80%
- Integration tests: >70%
- E2E tests: >50%

**Documentation**:
- All functions: JSDoc comments
- All modules: README.md
- All APIs: OpenAPI spec
- All features: User guide

---

## 🧩 Integration with Existing Docs

### Document Hierarchy

```
LOOP.md (This file - RALPH execution system)
    ↓
    Uses → agents.md (Code templates & patterns)
    ↓
    Refers → prompt.md (Development guidelines)
    ↓
    Reads → COMPLETE_SOLUTION_MAPPING.md (Service specs)
    ↓
    Reads → COMPLETE_SERVICES_SUMMARY.md (Service list)
    ↓
    Reads → CRITICAL_WORKFLOW_ISSUES_AUDIT.md (Known issues)
    ↓
    Tracks → LOOP_STATE.json (Progress state)
    ↓
    Outputs → proofs/[SERVICE-ID]-proof.md (Completion proof)
```

### How Documents Work Together

1. **LOOP.md**: Orchestration system (this file)
2. **agents.md**: Code generation instructions for AI
3. **prompt.md**: Guidelines for human developers
4. **COMPLETE_SOLUTION_MAPPING.md**: What to build (specs)
5. **COMPLETE_SERVICES_SUMMARY.md**: Service catalog
6. **CRITICAL_WORKFLOW_ISSUES_AUDIT.md**: What's broken
7. **SOLUTION_INDEX.md**: Navigation guide
8. **LOOP_STATE.json**: Current progress (runtime)
9. **proofs/*.md**: Completion evidence (outputs)

---

## 🔍 Troubleshooting

### Problem: Loop Gets Stuck on One Service

**Solution**:
```typescript
// After MAX_RETRY_PER_SERVICE attempts, mark as BLOCKED
if (service.attemptsCount >= 3) {
  service.status = 'blocked';
  service.blockedReason = 'Max retries exceeded';
  
  // Document in BLOCKED_SERVICES.md
  await documentBlocker(service);
  
  // Move to next service
  continue;
}
```

### Problem: Tests Keep Failing
**Solution**:
1. Read error logs carefully
2. Check if it's a real bug or test environment issue
3. Fix root cause, not symptoms
4. Add regression test
5. If persistent, mark as BLOCKED for human review

### Problem: TypeScript Compilation Fails
**Solution**:
```bash
# Clear generated files
rm -rf node_modules/.prisma
rm -rf .next

# Regenerate Prisma client
npx prisma generate

# Rebuild
npm run build
```

### Problem: Performance Tests Fail
**Solution**:
1. Check database indexes
2. Review query patterns (N+1 issues?)
3. Add pagination if missing
4. Optimize hot paths
5. Use React Server Components for data fetching

### Problem: Security Tests Fail
**Solution**:
```typescript
// NEVER allow this (security breach)
const data = await prisma.employee.findMany();

// ALWAYS filter by company_id
const data = await prisma.employee.findMany({
  where: { org_id: companyId } // MANDATORY
});
```

### Problem: State File Corrupted
**Solution**:
```bash
# Restore from backup
cp LOOP_STATE.backup.json LOOP_STATE.json

# Or rebuild from proofs
node scripts/rebuild-state-from-proofs.js
```

---

## 📝 Example: Complete Iteration Walkthrough

### Iteration 42: Implementing "Goal Management" (PERF-001)

#### PHASE 1: ANALYZE
```bash
Reading LOOP_STATE.json...
Current completion: 67.5%
Next service: PERF-001 (Goal Management)
Dependencies: Employee module (✓), Performance module scaffold (✓)
Loading spec from COMPLETE_SOLUTION_MAPPING.md...
```

#### PHASE 2: PLAN
```markdown
## Implementation Plan: Goal Management (PERF-001)
Estimated effort: 3/5

### Tasks:
1. Database: Add Goal, GoalMilestone, GoalComment tables
2. Backend: goal-engine.ts (CRUD + scoring logic)
3. API: /api/performance/goals
4. UI: /hr/performance/goals (list + detail + create)
5. Components: goal-card, goal-form, goal-timeline
6. Tests: 15 unit tests, 5 integration tests
```

#### PHASE 3: IMPLEMENT
```bash
Creating migration: 20260630103000_add_goals.sql
Updating schema.prisma...
Generating Prisma client...
Creating lib/performance/goal-engine.ts...
Creating app/api/performance/goals/route.ts...
Creating app/(portals)/hr/(main)/performance/goals/page.tsx...
Creating components/performance/goal-card.tsx...
Writing tests...

Files created: 12
Lines of code: 1,847
```

#### PHASE 4: TEST
```bash
Running TypeScript compilation...
✅ Build successful (0 errors)

Running ESLint...
✅ No security warnings

Running unit tests...
✅ 23/23 tests passed (87% coverage)

Running integration tests...
✅ 8/8 API tests passed

Running security checks...
✅ Multi-tenant isolation: PASS
✅ Authentication: PASS
✅ Authorization: PASS
✅ Input validation: PASS

Running performance tests...
✅ P95 latency: 320ms (target: <500ms)

Running accessibility tests...
⚠️ Lighthouse Accessibility: 85 (target: 90)
Issues: Missing ARIA labels on 3 buttons
```

#### PHASE 5: VERIFY
```bash
Verification Score: 85/100

Breakdown:
- Functionality: 20/20 ✅
- Security: 25/25 ✅
- Reliability: 20/20 ✅
- Scalability: 15/15 ✅
- User Experience: 8/10 ⚠️ (accessibility issues)
- Code Quality: 7/10 ⚠️ (missing JSDoc on 3 functions)

Status: NEEDS IMPROVEMENT
```

#### PHASE 6: CORRECT
```bash
Analyzing failures...

Issue 1: Missing ARIA labels
Location: components/performance/goal-card.tsx:45-48
Fix: Add aria-label to icon buttons

Issue 2: Incomplete JSDoc
Location: lib/performance/goal-engine.ts
Fix: Add comments to 3 functions

Applying fixes...
Re-running verification...
```

#### PHASE 5: VERIFY (Retry)
```bash
Verification Score: 95/100

Breakdown:
- Functionality: 20/20 ✅
- Security: 25/25 ✅
- Reliability: 20/20 ✅
- Scalability: 15/15 ✅
- User Experience: 10/10 ✅
- Code Quality: 5/10 ⚠️ (minor code duplication)

Status: PRODUCTION READY ✓ (score ≥90)
```

#### PHASE 7: RECORD
```bash
Updating LOOP_STATE.json...
Generating proof: proofs/PERF-001-proof.md...
Overall completion: 69.2% (44/64 services)

✅ Service PERF-001 (Goal Management) completed!
Attempts: 2
Final score: 95/100
```

---

## 🎓 Learning from Iterations

### Common Patterns That Work

1. **Start with Database**: Get schema right first
2. **Copy Similar Code**: Use existing modules as templates
3. **Test Early**: Don't wait until implementation is complete
4. **Iterate Fast**: Small fixes are better than rewrites
5. **Read Existing Code**: Patterns are already established

### Common Mistakes to Avoid

1. **Skipping Multi-Tenant Filter**: ALWAYS check `company_id`
2. **Forgetting Plan Checks**: Some features require paid plans
3. **Hardcoding Values**: Use configuration system
4. **Ignoring Accessibility**: Affects verification score
5. **Poor Error Messages**: Users need helpful feedback

---

## 🏁 Final Deliverables

### When Loop Completes Successfully

**Generated Files**:
1. **LOOP_STATE.json**: Final state (all services ≥90%)
2. **proofs/**: 64 proof documents (one per service)
3. **RALPH_COMPLETION_REPORT.md**: Executive summary
4. **RALPH_TECHNICAL_REPORT.md**: Detailed technical report
5. **reports/**: Milestone reports (25%, 50%, 75%, 90%, 100%)

**Completion Report Structure**:
```markdown
# RALPH Loop Completion Report

## Executive Summary
- **Start Date**: 2026-06-20
- **Completion Date**: 2026-06-30
- **Total Iterations**: 487
- **Services Completed**: 64/64 (100%)
- **Average Completion Score**: 93.2/100
- **Total Lines of Code**: 127,483
- **Total Tests Written**: 1,247 (99.8% passing)

## Highlights
- Zero critical security issues
- All plan-based features working
- Multi-tenant isolation verified
- Performance benchmarks met
- Accessibility standards met

## Services by Category
1. Core Services (8): 100% complete
2. Employee Management (6): 100% complete
3. Time & Attendance (5): 100% complete
4. Leave Management (4): 100% complete
5. Payroll (7): 100% complete
6. Performance Management (6): 100% complete
7. Learning & Development (8): 100% complete
8. Recruitment (5): 100% complete
9. Compensation & Benefits (6): 100% complete
10. Reports & Analytics (4): 100% complete
11. Configuration & Admin (5): 100% complete

## Production Readiness
✅ All services production-ready
✅ Security verified
✅ Performance verified
✅ Scalability verified
✅ Documentation complete

## Next Steps
1. Final QA review by human team
2. Staging deployment
3. Load testing
4. User acceptance testing
5. Production deployment

**Status**: READY FOR PRODUCTION 🚀
```

---

## 🤖 RALPH Personality Traits

### Core Characteristics

1. **Resilient**: Never gives up, finds alternative approaches
2. **Autonomous**: Makes decisions without human intervention
3. **Methodical**: Follows systematic process
4. **Perfectionist**: Only accepts ≥90% quality
5. **Transparent**: Provides detailed progress reports
6. **Self-Correcting**: Learns from failures
7. **Goal-Oriented**: Focused on end result (all services complete)

### Decision-Making Logic

```typescript
// RALPH's decision tree for handling failures

if (testsFailed) {
  if (attemptCount < MAX_RETRY_PER_FAILURE) {
    // Try to fix
    analyzeFailure();
    generateFixStrategy();
    applyFix();
    retryTest();
  } else {
    // Mark as blocked, move on
    markAsBlocked();
    documentIssue();
    moveToNextService();
  }
}

if (verificationFailed) {
  if (score >= 80 && score < 90) {
    // Close to target, iterate
    identifyWeakPoints();
    improveImplementation();
    retryVerification();
  } else if (score < 80) {
    // Major issues, consider restart
    if (attemptCount < MAX_RETRY_PER_SERVICE) {
      reviewSpecification();
      restartImplementation();
    } else {
      markAsBlocked();
    }
  }
}

if (allServicesComplete) {
  generateCompletionReport();
  exitSuccess();
}

if (iterationCount >= MAX_ITERATIONS) {
  generateProgressReport();
  documentIncomplete();
  exitSafety();
}
```

---

## 📞 Support & Escalation

### When RALPH Needs Human Help

**Blocked Service Scenarios**:
1. External API not responding (e.g., WhatsApp Business API)
2. Unclear business requirements in spec
3. Conflicting requirements between modules
4. Missing dependencies (npm packages, system tools)
5. Database migration conflicts
6. Performance issues despite optimization
7. Third-party service integration issues

**Escalation File**: `BLOCKED_SERVICES.md`
```markdown
# Blocked Services Requiring Human Review

## WHATSAPP-001: WhatsApp Business API Integration
**Status**: BLOCKED  
**Attempts**: 3  
**Last Attempt**: 2026-06-28 15:30  
**Blocker**: API credentials not configured  
**Resolution Needed**: 
1. Register WhatsApp Business Account
2. Obtain API credentials
3. Configure environment variables
4. Test webhook endpoint

**Impact**: Blocks WHATSAPP-002, WHATSAPP-003

## RECRUIT-005: Job Board Integration
**Status**: BLOCKED  
**Attempts**: 3  
**Last Attempt**: 2026-06-29 10:15  
**Blocker**: Indeed API returns 403 Forbidden  
**Resolution Needed**:
1. Verify Indeed Partner account status
2. Check API key permissions
3. Review rate limiting

**Impact**: None (standalone feature)
```

---

## 🎯 Final Reminders for RALPH

### Critical Rules (Never Violate)

1. ✅ ALWAYS filter by `company_id` (multi-tenant isolation)
2. ✅ ALWAYS check authentication (no unauthenticated access)
3. ✅ ALWAYS check permissions (RBAC enforcement)
4. ✅ ALWAYS check plan features (subscription gating)
5. ✅ ALWAYS validate input (prevent injection attacks)
6. ✅ ALWAYS use Prisma (never raw SQL)
7. ✅ ALWAYS add audit logs (sensitive operations)
8. ✅ ALWAYS save state (enable recovery)
9. ✅ ALWAYS generate proof (demonstrate completion)
10. ✅ ALWAYS follow templates (consistency)

### Quality Standards (Never Compromise)

1. ✅ TypeScript compilation: MUST pass (zero errors)
2. ✅ Security tests: MUST pass (zero exceptions)
3. ✅ Multi-tenant isolation: MUST be verified
4. ✅ Test coverage: ≥80% (unit tests)
5. ✅ Performance: P95 <500ms (API endpoints)
6. ✅ Accessibility: Lighthouse ≥90
7. ✅ Code quality: ESLint passing
8. ✅ Documentation: JSDoc on all functions
9. ✅ User experience: No confusing workflows
10. ✅ Production ready: Would deploy to live customers

### Work Philosophy

- **Speed**: Work fast, iterate quickly
- **Quality**: Never sacrifice security or data integrity
- **Completeness**: >90% is the minimum, not the target
- **Autonomy**: Make decisions confidently
- **Transparency**: Document everything
- **Resilience**: Find alternative approaches when blocked
- **Goal Focus**: All 64 services complete, no exceptions

---

## 🚀 Ready to Start?

```bash
# Initialize RALPH
echo "🤖 Initializing RALPH Loop System..."

# Create state
mkdir -p proofs reports
echo '{"version":"1.0.0","iteration":0,"services":[]}' > LOOP_STATE.json

# Load config
cat > RALPH_CONFIG.json << 'EOF'
{
  "max_iterations": 500,
  "completion_threshold": 90,
  "auto_commit": true,
  "verbose_logging": true
}
EOF

# Start loop
echo "🚀 Starting RALPH Loop..."
echo "📋 Target: 64 services at >90% completion"
echo "⏱️ Estimated time: ~10 days continuous operation"
echo ""
echo "Press Ctrl+C to pause (state will be saved)"
echo "Run 'node ralph-loop.js' to start"
```

---

## 📚 Appendix

### A. Template File Locations
- Database migrations: `web/prisma/migrations/`
- Schema: `web/prisma/schema.prisma`
- Backend services: `web/lib/[module]/[service]-engine.ts`
- API routes: `web/app/api/[module]/route.ts`
- UI pages: `web/app/(portals)/[portal]/(main)/[module]/page.tsx`
- Components: `web/components/[module]/`
- Tests: `web/tests/[module]/`

### B. Command Reference
```bash
# Database
npx prisma migrate dev --name [name]
npx prisma generate
npx prisma studio

# Build
npm run build
npm run dev

# Testing
npm run test
npm run test:integration
npm run test:e2e
npm run lint

# Performance
npm run lighthouse
npm run analyze

# State management
cat LOOP_STATE.json
cat proofs/[SERVICE-ID]-proof.md
cat reports/progress-report.md
```

### C. Service ID Reference
```
CORE-001 to CORE-008: Core & Company Management
EMP-001 to EMP-006: Employee Management
ATT-001 to ATT-005: Time & Attendance
LEAVE-001 to LEAVE-004: Leave Management
PAY-001 to PAY-007: Payroll & Compensation
PERF-001 to PERF-006: Performance Management
LMS-001 to LMS-008: Learning & Development
RECRUIT-001 to RECRUIT-005: Recruitment
COMP-001 to COMP-006: Compensation & Benefits
RPT-001 to RPT-004: Reports & Analytics
CFG-001 to CFG-005: Configuration & Admin
```

### D. Plan Feature Matrix
```
Free: Basic employee records, basic attendance
Starter: + Leave management, basic payroll
Growth: + Performance, LMS, advanced reports
Enterprise: + Custom workflows, API access, SSO
```

### E. Permission Categories
```
70+ permissions across:
- company.* (8 permissions)
- employee.* (12 permissions)
- attendance.* (6 permissions)
- leave.* (8 permissions)
- payroll.* (10 permissions)
- performance.* (8 permissions)
- lms.* (10 permissions)
- reports.* (8 permissions)
```

---

## ✅ Checklist: Is RALPH Ready?

Before starting the loop, verify:

- [ ] Read `COMPLETE_SOLUTION_MAPPING.md` (understand all 64 services)
- [ ] Read `agents.md` (understand code templates)
- [ ] Read `prompt.md` (understand guidelines)
- [ ] Read `CRITICAL_WORKFLOW_ISSUES_AUDIT.md` (understand issues)
- [ ] Understand multi-tenant architecture
- [ ] Understand plan-based feature gating
- [ ] Understand RBAC permission system
- [ ] Understand configuration-driven design
- [ ] Have access to codebase (`web/` directory)
- [ ] Can run tests (`npm run test`)
- [ ] Can build project (`npm run build`)
- [ ] Understand exit criteria (all services ≥90%)
- [ ] Understand safety limits (max 500 iterations)
- [ ] Can generate proof documents
- [ ] Can update state file
- [ ] Ready to work autonomously until completion

**If all checked, RALPH is ready to go! 🚀**

---

**End of LOOP.md**

**Version**: 1.0.0  
**Last Updated**: 2026-06-30  
**Status**: READY FOR EXECUTION

**Remember**: RALPH works until ALL services reach >90% completion with proof of production readiness. No shortcuts, no compromises, only perfect results.

**Let's build the best enterprise HRMS platform! 💪**
