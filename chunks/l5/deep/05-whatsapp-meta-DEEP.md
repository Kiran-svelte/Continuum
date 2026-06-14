# L5-DEEP — Chunk 05: WhatsApp / Meta (Exhaustive)

> Companion to [`../05-whatsapp-meta-L5.md`](../05-whatsapp-meta-L5.md)  
> **BLOCKED until G1–G6 PASS**

---

## DEEP-05-001 — Meta App Dashboard checklist (G6)

| Step | Location | Done |
|------|----------|------|
| Create Meta Business App | developers.facebook.com | ☐ |
| Add WhatsApp product | App Dashboard | ☐ |
| Add test phone number | WhatsApp → API Setup | ☐ |
| Generate permanent token | Business Settings → System Users | ☐ |
| Set webhook URL | WhatsApp → Configuration | ☐ |
| Subscribe messages field | Webhook fields | ☐ |
| Submit continuum_verify_code template | Message templates | ☐ |
| Record phone_number_id | meta-waba-ready.md | ☐ |

---

## DEEP-05-002 — graph-client.ts exports

```typescript
export async function sendTextMessage(params: {
  phoneNumberId: string;
  accessToken: string;
  toWaId: string;
  body: string;
}): Promise<{ messageId: string }>;

export async function sendInteractiveButtons(params: {
  phoneNumberId: string;
  accessToken: string;
  toWaId: string;
  body: string;
  buttons: Array<{ id: string; title: string }>;
}): Promise<{ messageId: string }>;

export async function sendDocument(params: {
  phoneNumberId: string;
  accessToken: string;
  toWaId: string;
  documentUrl: string;
  filename: string;
  caption?: string;
}): Promise<{ messageId: string }>;

export async function markAsRead(params: {
  phoneNumberId: string;
  accessToken: string;
  messageId: string;
}): Promise<void>;
```

---

## DEEP-05-003 — inbound-handler.ts orchestration

```typescript
export async function handleWhatsAppInbound(event: ParsedInboundEvent): Promise<void> {
  const tenant = await resolveTenantByPhoneNumberId(event.phoneNumberId);
  if (!tenant) { logChannelEvent('warn', 'wa_unknown_phone_number_id', { id: event.phoneNumberId }); return; }
  if (await isDuplicateMessage(event.messageId)) return;
  if (!tenant.messaging_enabled) { await sendDisabledMessage(tenant, event.from); return; }
  if (await isBlocked(tenant.companyId, event.from)) return;
  if (isStopKeyword(event.text)) { await handleStop(tenant, event.from); return; }
  if (isHelpKeyword(event.text)) { await sendHelpMenu(tenant, event.from); return; }
  const link = await findActiveLink(tenant.companyId, event.from);
  if (!link) { await handleUnlinkedUser(tenant, event); return; }
  const ctx = await buildContextFromLink(link, { externalMessageId: event.messageId });
  const reply = await processAssistantTurn({ ctx, message: event.text, actionCommand: mapButton(event.buttonId) });
  const outbounds = assistantReplyToWhatsAppMessages(reply);
  for (const msg of outbounds) { await sendWithRetry(tenant, event.from, msg); }
  await markProcessed(event.messageId);
}
```

---

## DEEP-05-004 — Keyword detection

| Keyword | Regex | Action |
|---------|-------|--------|
| STOP | `/^STOP$/i` | opt-out |
| HELP | `/^HELP$/i` | menu |
| START | `/^START$/i` | re-opt-in instructions |
| LINK | `/^LINK\s+(\S+)/i` | web link token flow |

---

## DEEP-05-005 — Payslip over WhatsApp (A9)

1. getLatestPayslipService returns pdfUrl  
2. If file size < 16MB — sendDocument with signed URL  
3. Else — sendTextMessage with deep link to `/employee/payslips`  
4. Never send PDF to wrong waId — ctx enforces employee scope

---

## DEEP-05-006 — Template message JSON (verify code)

```json
{
  "messaging_product": "whatsapp",
  "to": "919876543210",
  "type": "template",
  "template": {
    "name": "continuum_verify_code",
    "language": { "code": "en" },
    "components": [
      {
        "type": "body",
        "parameters": [{ "type": "text", "text": "123456" }]
      }
    ]
  }
}
```

---

## DEEP-05-007 — Admin page form fields

| Field | Type | Validation |
|-------|------|------------|
| wabaId | text | digits |
| phoneNumberId | text | digits |
| accessToken | password | min length 50 |
| authorizedCheckbox | checkbox | required before submit |

**POST connect disabled until checkbox checked**

---

## DEEP-05-008 — Staging vs production isolation

| Resource | Staging | Production |
|----------|---------|------------|
| Meta App | Continuum Staging | Continuum Prod |
| phone_number_id | test number | customer WABA |
| WHATSAPP_APP_SECRET | staging secret | prod secret |
| DB | staging Neon branch | prod Neon |

**Never use prod token on staging app**

---

## DEEP-05-009 — WA tests WA-26 – WA-40

| ID | Test |
|----|------|
| WA-26 | inbound image type ignored 200 |
| WA-27 | status delivered webhook ignored |
| WA-28 | Graph timeout retries |
| WA-29 | sendDocument payslip |
| WA-30 | deep link when doc too large |
| WA-31 | LINK token happy path |
| WA-32 | LINK token expired |
| WA-33 | START after STOP instructions |
| WA-34 | multi-chunk outbound order preserved |
| WA-35 | markAsRead failure non-fatal |
| WA-36 | connect invalid token 400 |
| WA-37 | admin hr both can connect |
| WA-38 | employee GET settings 403 |
| WA-39 | cross-tenant phone_number_id isolation |
| WA-40 | e2e proof markdown committed |

---

## DEEP-05-010 — Chunk 05 implementation order

1. verify-signature.ts + unit tests  
2. parse-inbound.ts + fixtures from Meta sample JSON  
3. graph-client.ts + mock tests  
4. GET/POST webhook route  
5. inbound-handler.ts (stub replies)  
6. connect API + admin page  
7. OTP + link flows  
8. wire processAssistantTurn  
9. dedupe + session window  
10. whatsapp-e2e-proof.ts  
11. WA-01–40 green  
12. meta-waba-ready.md G6 sign
