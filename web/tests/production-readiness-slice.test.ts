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

test('document file upload is R2-only and fails visibly when storage fails', () => {
  const route = source('app/api/documents/upload/route.ts');

  assert.match(route, /requireCompanyContext\(employee\)/);
  assert.match(route, /assertModule\(employee\.org_id,\s*'documents'\)/);
  assert.match(route, /uploadTenantFile\(uploadedFile,\s*\{\s*folder:\s*'documents'/);
  assert.match(route, /url:\s*uploaded\.key/);
  assert.match(route, /url:\s*uploaded\.downloadUrl/);
  assert.match(route, /storageMethod:\s*'r2'/);
  assert.match(route, /status:\s*422/);

  assert.doesNotMatch(route, /supabase\.storage/);
  assert.doesNotMatch(route, /trySupabaseUpload/);
  assert.doesNotMatch(route, /toBase64DataUrl/);
  assert.doesNotMatch(route, /placeholder:\/\/upload-pending/);
  assert.doesNotMatch(route, /storageMethod:\s*'supabase'/);
  assert.doesNotMatch(route, /storageMethod:\s*'base64'/);
  assert.doesNotMatch(route, /storageMethod:\s*'placeholder'/);
});

test('documents API serializes private storage keys through signed download endpoint', () => {
  const route = source('app/api/documents/route.ts');

  assert.match(route, /isPrivateStorageKey\(url\)/);
  assert.match(route, /buildStorageDownloadPath\(url,\s*true\)/);
  assert.match(route, /documents:\s*documents\.map\(\(document\) => \(\{/);
  assert.match(route, /url:\s*serializeDocumentUrl\(document\.url\)/);
  assert.match(route, /url:\s*serializeDocumentUrl\(updated\.url\)/);
});

test('storage upload and download endpoints enforce tenant-scoped R2 keys', () => {
  const uploadRoute = source('app/api/storage/upload/route.ts');
  const genericUploadRoute = source('app/api/upload/route.ts');
  const categoryUploadRoute = source('app/api/upload/[category]/route.ts');
  const downloadRoute = source('app/api/storage/download/route.ts');
  const r2Client = source('lib/storage/r2-client.ts');
  const fileUpload = source('lib/file-upload.ts');

  assert.match(uploadRoute, /requireCompanyContext\(employee\)/);
  assert.match(uploadRoute, /isStorageFolder\(folder\)/);
  assert.match(uploadRoute, /uploadTenantFile\(file,\s*\{/);
  assert.match(uploadRoute, /storage:\s*'r2'/);

  assert.match(genericUploadRoute, /uploadTenantFile\(file,\s*\{/);
  assert.match(genericUploadRoute, /url:\s*uploaded\.downloadUrl/);
  assert.match(genericUploadRoute, /storageKey:\s*uploaded\.key/);
  assert.match(genericUploadRoute, /storage:\s*'r2'/);
  assert.doesNotMatch(genericUploadRoute, /url:\s*result\.url/);

  assert.match(categoryUploadRoute, /STORAGE_FOLDER_BY_CATEGORY/);
  assert.match(categoryUploadRoute, /'course-content':\s*'attachments'/);
  assert.match(categoryUploadRoute, /'expense-receipt':\s*'receipts'/);
  assert.match(categoryUploadRoute, /uploadTenantFile\(file,\s*\{/);
  assert.match(categoryUploadRoute, /url:\s*uploaded\.downloadUrl/);
  assert.match(categoryUploadRoute, /storage:\s*'r2'/);
  assert.doesNotMatch(categoryUploadRoute, /fs\/promises/);
  assert.doesNotMatch(categoryUploadRoute, /writeFile/);
  assert.doesNotMatch(categoryUploadRoute, /mkdir/);
  assert.doesNotMatch(categoryUploadRoute, /existsSync/);
  assert.doesNotMatch(categoryUploadRoute, /public['"],\s*['"]uploads/);
  assert.doesNotMatch(categoryUploadRoute, /\/uploads\//);

  assert.match(downloadRoute, /isPrivateStorageKey\(key\)/);
  assert.match(downloadRoute, /isStorageKeyForCompany\(key,\s*actor\.org_id\)/);
  assert.match(downloadRoute, /generateSignedDownloadUrl\(\{\s*key,\s*ttlSeconds:\s*3600\s*\}\)/);
  assert.match(downloadRoute, /NextResponse\.redirect\(result\.url\)/);

  assert.match(r2Client, /parts\.length >= 4 && isStorageFolder\(parts\[0\]\) && parts\[1\] === companyId/);
  assert.match(r2Client, /\/api\/storage\/download\?\$\{params\.toString\(\)\}/);
  assert.doesNotMatch(r2Client, /placeholder:\/\/upload-pending/);

  assert.match(fileUpload, /'video\/mp4':\s*'\.mp4'/);
  assert.match(fileUpload, /'application\/vnd\.openxmlformats-officedocument\.presentationml\.presentation':\s*'\.pptx'/);
  assert.match(fileUpload, /normalizedEndpoint \? `\/\$\{config\.bucket\}\/\$\{key\}` : `\/\$\{key\}`/);
  assert.match(fileUpload, /fetch\(`\$\{endpoint\}\$\{canonicalUri\}`/);
});

test('health and readiness surfaces report missing R2 storage without exposing secrets', () => {
  const health = source('lib/enterprise/health.ts');
  const readiness = source('app/api/health/ready/route.ts');
  const adminHealth = source('app/api/admin/health/route.ts');
  const envCheck = source('app/api/security/env-check/route.ts');
  const publicStatusApi = source('app/api/status/public/route.ts');
  const statusPage = source('app/status/page.tsx');
  const opsReadiness = source('lib/operations-readiness/evaluate.ts');
  const publicStatus = source('components/pages/public/status-view.tsx');
  const storageReadiness = source('lib/storage/readiness.ts');
  const fileUpload = source('lib/file-upload.ts');
  const signedUrl = source('lib/storage/signed-url.ts');

  assert.match(storageReadiness, /REQUIRED_UPLOAD_STORAGE_ENV = \[/);
  assert.match(storageReadiness, /'UPLOAD_BUCKET'/);
  assert.match(storageReadiness, /'UPLOAD_ACCESS_KEY'/);
  assert.match(storageReadiness, /'UPLOAD_SECRET_KEY'/);
  assert.match(storageReadiness, /'UPLOAD_ENDPOINT'/);
  assert.match(storageReadiness, /missingRequired/);
  assert.match(storageReadiness, /endpoint.*r2\.cloudflarestorage\.com/);
  assert.match(storageReadiness, /envSet\('UPLOAD_ENDPOINT'\) \? 'auto' : 'ap-south-1'/);

  assert.match(fileUpload, /resolveUploadStorageRegion\(\)/);
  assert.match(signedUrl, /resolveUploadStorageRegion\(\)/);

  assert.match(health, /getUploadStorageReadiness/);
  assert.match(health, /storage:\s*checkStorageService\(\)/);
  assert.match(health, /Upload storage not configured: missing/);
  assert.match(health, /Custom JWT auth active; Neon Auth optional check skipped/);
  assert.match(health, /provider:\s*'custom-jwt'/);
  assert.doesNotMatch(health, /message:\s*'Neon Auth not configured'/);
  assert.match(health, /isServerless/);
  assert.match(health, /rssMB > 900/);
  assert.match(health, /heapUsedMB > 512/);
  assert.match(health, /usagePercent > 95/);

  assert.match(readiness, /getUploadStorageReadiness/);
  assert.match(readiness, /name:\s*'upload_storage'/);
  assert.match(readiness, /Upload storage is not configured/);
  assert.match(readiness, /status = isReady \? 200 : 503/);

  assert.match(publicStatusApi, /checkHealth/);
  assert.match(publicStatusApi, /affected/);
  assert.match(publicStatusApi, /updatedAt:\s*health\.timestamp/);
  assert.doesNotMatch(publicStatusApi, /PUBLIC_SYSTEM_STATUS/);
  assert.doesNotMatch(publicStatusApi, /PUBLIC_SYSTEM_STATUS_MESSAGE/);

  assert.match(statusPage, /dynamic = 'force-dynamic'/);
  assert.match(statusPage, /components\/pages\/public\/status-view/);
  assert.doesNotMatch(statusPage, /Email delivery delays/);
  assert.doesNotMatch(statusPage, /Jan 10, 2025/);

  assert.match(adminHealth, /RESEND_API_KEY/);
  assert.match(adminHealth, /EMAIL_PROVIDER/);
  assert.match(adminHealth, /Resend configured/);
  assert.match(adminHealth, /getUploadStorageReadiness/);
  assert.match(adminHealth, /checks\.storage/);

  assert.match(envCheck, /'UPLOAD_BUCKET'/);
  assert.match(envCheck, /'UPLOAD_ACCESS_KEY'/);
  assert.match(envCheck, /'UPLOAD_SECRET_KEY'/);
  assert.match(envCheck, /'UPLOAD_ENDPOINT'/);
  assert.match(envCheck, /'RESEND_API_KEY'/);
  assert.doesNotMatch(envCheck, /SUPABASE_SERVICE_ROLE_KEY/);
  assert.doesNotMatch(envCheck, /NEXT_PUBLIC_SUPABASE_ANON_KEY/);

  assert.match(opsReadiness, /getUploadStorageReadiness/);
  assert.match(opsReadiness, /Set \$\{name\} in Vercel production/);
  assert.match(publicStatus, /Upload Storage/);
});
