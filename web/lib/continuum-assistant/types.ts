import type { PortalSlug } from '@/lib/navigation/portal-nav';
import type { AssistantPersonalSnapshot } from '@/lib/continuum-assistant/personal-snapshot';
import type {
  AssistantActionDraft,
  AssistantActionResult,
  AssistantPendingAction,
} from '@/lib/continuum-assistant/action-types';
import type { PermissionCode } from '@/lib/rbac';

export type AssistantLink = {
  label: string;
  href: string;
};

export type AssistantMessage = {
  role: 'user' | 'assistant';
  content: string;
};

export type AssistantContext = {
  employeeId: string;
  companyId: string;
  companyName: string;
  role: string;
  portalSlug: PortalSlug;
  displayName: string;
  enabledModules: string[];
  permissions: PermissionCode[];
  navHints: Array<{ label: string; href: string }>;
  /** Populated server-side for the signed-in user only — never other employees. */
  personalSnapshot?: AssistantPersonalSnapshot | null;
};

export type AssistantReply = {
  reply: string;
  links: AssistantLink[];
  suggestions: string[];
  source: 'rules' | 'openai' | 'hybrid';
  /** Active human-in-the-loop action; client must send back until null. */
  actionDraft?: AssistantActionDraft | null;
  /** Shown when status is awaiting_confirmation. */
  pendingAction?: AssistantPendingAction | null;
  actionResult?: AssistantActionResult | null;
};
