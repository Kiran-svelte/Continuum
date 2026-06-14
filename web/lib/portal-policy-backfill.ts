/**
 * Portal policy backfill helpers — additive, idempotent migrations of CompanySettings.portal_policy JSON.
 * Extended with messaging policy for Zero UI pre-flight (L5-07-005).
 */
import type { Prisma } from '@prisma/client';

export type ChecklistItem = {
  id: string;
  label: string;
  completed: boolean;
};

export type IntegrationConnector = {
  id: string;
  label: string;
  status: string;
};

export type AlertsConfig = {
  channels: {
    email: boolean;
    in_app?: boolean;
    whatsapp?: boolean;
  };
};

export type PortalPolicy = {
  onboardingChecklist: ChecklistItem[];
  alertsConfig: AlertsConfig;
  integrations: IntegrationConnector[];
  welcomeSequence?: Record<string, unknown>;
  messaging?: Record<string, unknown>;
};

export type MessagingPolicy = {
  require_employee_phone: boolean;
  whatsapp_opt_in_required: boolean;
  chat_retention_days: number;
};

const DEFAULT_CHECKLIST: ChecklistItem[] = [
  { id: 'company-basics', label: 'Complete company basics', completed: false },
  { id: 'leave-types', label: 'Configure leave types', completed: false },
  { id: 'invite-team', label: 'Invite your team', completed: false },
];

const DEFAULT_INTEGRATIONS: IntegrationConnector[] = [
  { id: 'email', label: 'Email notifications', status: 'connected' },
];

const DEFAULT_ALERTS: AlertsConfig = {
  channels: { email: true, in_app: true, whatsapp: false },
};

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

/**
 * Normalizes portal policy JSON with defaults (idempotent).
 */
export function backfillPortalPolicy(input: unknown): PortalPolicy {
  const raw = asRecord(input);
  return {
    onboardingChecklist: backfillOnboardingChecklist(raw.onboardingChecklist),
    alertsConfig: backfillAlerts(raw.alertsConfig),
    integrations: backfillIntegrations(raw.integrations),
    welcomeSequence: asRecord(raw.welcomeSequence),
    messaging: asRecord(raw.messaging),
  };
}

export function backfillOnboardingChecklist(input: unknown): ChecklistItem[] {
  if (!Array.isArray(input) || input.length === 0) {
    return DEFAULT_CHECKLIST.map((item) => ({ ...item }));
  }
  return input
    .filter((item) => item && typeof item === 'object')
    .map((item) => {
      const row = item as Record<string, unknown>;
      return {
        id: String(row.id ?? 'step'),
        label: String(row.label ?? 'Step'),
        completed: row.completed === true,
      };
    });
}

export function backfillIntegrations(input: unknown): IntegrationConnector[] {
  if (!Array.isArray(input) || input.length === 0) {
    return DEFAULT_INTEGRATIONS.map((item) => ({ ...item }));
  }
  return input
    .filter((item) => item && typeof item === 'object')
    .map((item) => {
      const row = item as Record<string, unknown>;
      return {
        id: String(row.id ?? 'connector'),
        label: String(row.label ?? 'Connector'),
        status: String(row.status ?? 'disconnected'),
      };
    });
}

export function backfillAlerts(input: unknown): AlertsConfig {
  const raw = asRecord(input);
  const channels = asRecord(raw.channels);
  return {
    channels: {
      email: channels.email !== false,
      in_app: channels.in_app !== false,
      whatsapp: channels.whatsapp === true,
    },
  };
}

export function toPrismaJson(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

/**
 * Reads messaging policy from hr_alerts or portal_policy.messaging (L5-07-005).
 */
export function readMessagingPolicy(
  hrAlerts: Record<string, unknown> | null | undefined
): MessagingPolicy {
  const messaging =
    hrAlerts?.messaging && typeof hrAlerts.messaging === 'object'
      ? (hrAlerts.messaging as Record<string, unknown>)
      : null;

  return {
    require_employee_phone: messaging?.require_employee_phone === true,
    whatsapp_opt_in_required: messaging?.whatsapp_opt_in_required !== false,
    chat_retention_days:
      typeof messaging?.chat_retention_days === 'number' ? messaging.chat_retention_days : 90,
  };
}

/** @deprecated use readMessagingPolicy — kept for Chunk 07 messaging extension import sites */
export type MessagingPolicyExtension = MessagingPolicy;

export const DEFAULT_MESSAGING_POLICY: MessagingPolicy = {
  require_employee_phone: false,
  whatsapp_opt_in_required: true,
  chat_retention_days: 90,
};
