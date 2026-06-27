import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

function source(path: string): string {
  return readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
}

test('email resend endpoint reports delivery outcomes instead of silent success', () => {
  const route = source('app/api/email/resend/route.ts');

  assert.match(route, /buildActionOutcome/);
  assert.match(route, /sideEffectFromEmail/);
  assert.match(route, /emailSent/);
  assert.match(route, /emailError/);
  assert.match(route, /status:\s*email\.success \? 200 : 502/);
});

test('Cashfree upgrade flow stores pending payments and activates subscriptions after payment', () => {
  const upgradeRoute = source('app/api/payments/upgrade/route.ts');
  const statusRoute = source('app/api/payments/status/route.ts');
  const paymentService = source('lib/payment-service.ts');

  assert.match(upgradeRoute, /requirePermissionGuard\(actor,\s*'company\.manage_billing'\)/);
  assert.match(upgradeRoute, /cashfree_order_id:\s*order\.orderId/);
  assert.match(upgradeRoute, /status:\s*'pending'/);
  assert.match(upgradeRoute, /cf-\$\{plan\}-/);

  assert.match(statusRoute, /markCashfreeOrderStatus\(\{\s*orderId,\s*status:\s*'completed'/);

  assert.match(paymentService, /getCashfreePlanFromOrderId/);
  assert.match(paymentService, /status:\s*'active'/);
  assert.match(paymentService, /current_period_start/);
  assert.match(paymentService, /current_period_end/);
  assert.match(paymentService, /clampModulesForPlan\(payment\.company_id,\s*plan\)/);
});
