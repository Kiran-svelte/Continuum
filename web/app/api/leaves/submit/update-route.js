const fs = require('fs');
const path = 'D:/Continuum/web/app/api/leaves/submit/route.ts';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(
  "import { sendNotification, sendPusherEvent } from '@/lib/notification-service';",
  "import { sendNotification, sendPusherEvent } from '@/lib/notification-service';\nimport { evaluateLeaveRequest } from '@/lib/ai-engine/decision-engine';"
);

const fetchBlockRegex = /\/\/ Call Python constraint engine with timeout[\s\S]*?(?=if \(constraintStatus === 'fail'\))/m;
const fetchBlock = content.match(fetchBlockRegex);
if(fetchBlock) {
  content = content.replace(fetchBlockRegex, \    // Call AI Decision Engine natively
    const aiDecision = await evaluateLeaveRequest(employee.id, employee.org_id!, {
      leave_type: leaveType,
      start_date: startDate,
      end_date: endDate,
      total_days: totalDays,
      is_half_day: data.is_half_day,
      reason: reason
    });

    let constraintResult: Record<string, unknown> | null = null;
    let constraintStatus: 'pass' | 'warnings' | 'fail' = 'pass';

    if (aiDecision.decision === 'escalate') {
      constraintStatus = 'warnings';
    }

    constraintResult = {
      decision: aiDecision.decision,
      confidence_score: aiDecision.confidence,
      reasoning: aiDecision.reasoning,
      risk_score: aiDecision.risk_score,
      flags: aiDecision.flags,
      recommendation: aiDecision.decision === 'auto_approve' ? 'APPROVE' : 'MANUAL_REVIEW'
    };

    \);
}

// Modify leaveRequest creation to include ai logs
const prismaCreateRegex = /constraint_result: constraintResult\s*\n\s*\?\s*\(constraintResult as Prisma\.InputJsonValue\)\s*\n\s*:\s*undefined,/;

content = content.replace(prismaCreateRegex, \constraint_result: constraintResult ? (constraintResult as Prisma.InputJsonValue) : undefined,
        ai_decision: aiDecision.decision,
        ai_confidence: aiDecision.confidence,
        ai_reasoning: aiDecision.reasoning.join('; '),
        ai_risk_score: aiDecision.risk_score,
\);

fs.writeFileSync(path, content, 'utf8');
console.log('Update complete.');
