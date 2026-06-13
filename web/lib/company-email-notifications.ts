type JsonRecord = Record<string, unknown>;

export type CompanyEmailNotificationSettings = {
  emailEnabled: boolean;
  managerAlerts: boolean;
  dailyDigest: boolean;
  slaAlerts: boolean;
};

export type CompanyEmailNotificationChannel =
  | 'general'
  | 'manager_alert'
  | 'daily_digest'
  | 'sla_alert';

const DEFAULT_SETTINGS: CompanyEmailNotificationSettings = {
  emailEnabled: true,
  managerAlerts: true,
  dailyDigest: true,
  slaAlerts: true,
};

function toJsonRecord(value: unknown): JsonRecord {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return {};
  }
  return value as JsonRecord;
}

function readBoolean(record: JsonRecord, keys: string[], fallback: boolean): boolean {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'boolean') {
      return value;
    }
  }
  return fallback;
}

export function resolveCompanyEmailNotificationSettings(raw: unknown): CompanyEmailNotificationSettings {
  const record = toJsonRecord(raw);
  return {
    emailEnabled: readBoolean(record, ['email_enabled', 'emailEnabled', 'notify_email_enabled'], DEFAULT_SETTINGS.emailEnabled),
    managerAlerts: readBoolean(record, ['manager_alerts', 'managerAlerts'], DEFAULT_SETTINGS.managerAlerts),
    dailyDigest: readBoolean(record, ['daily_digest', 'dailyDigest'], DEFAULT_SETTINGS.dailyDigest),
    slaAlerts: readBoolean(record, ['sla_alerts', 'slaAlerts'], DEFAULT_SETTINGS.slaAlerts),
  };
}

export function shouldSendCompanyEmail(
  settings: CompanyEmailNotificationSettings,
  channel: CompanyEmailNotificationChannel
): boolean {
  if (!settings.emailEnabled) {
    return false;
  }

  if (channel === 'manager_alert') {
    return settings.managerAlerts;
  }

  if (channel === 'daily_digest') {
    return settings.dailyDigest;
  }

  if (channel === 'sla_alert') {
    return settings.slaAlerts;
  }

  return true;
}
