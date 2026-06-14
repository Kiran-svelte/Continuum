import prisma from '@/lib/prisma';

export type ChannelRevokeReason =
  | 'phone_changed'
  | 'employee_terminated'
  | 'user_unlinked'
  | 'admin_revoked'
  | 'stop_opt_out';

export async function revokeChannelLinksForEmployee(
  employeeId: string,
  reason: ChannelRevokeReason,
  channel?: 'whatsapp'
): Promise<number> {
  const result = await prisma.channelIdentityLink.updateMany({
    where: {
      employee_id: employeeId,
      revoked_at: null,
      ...(channel ? { channel } : {}),
    },
    data: {
      revoked_at: new Date(),
      revoke_reason: reason,
    },
  });

  return result.count;
}
