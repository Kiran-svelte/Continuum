import Link from 'next/link';
import { UserPlus, FileSpreadsheet } from 'lucide-react';

type PeopleInviteActionsProps = {
  inviteHref: string;
  allowBulk: boolean;
};

export function PeopleInviteActions({ inviteHref, allowBulk }: PeopleInviteActionsProps) {
  const bulkHref = inviteHref.includes('?')
    ? `${inviteHref}&mode=bulk`
    : `${inviteHref}?mode=bulk`;

  return (
    <div className="flex flex-wrap items-center gap-2 shrink-0">
      <Link
        href={inviteHref}
        className="inline-flex items-center justify-center gap-2 min-h-11 px-4 py-2.5 bg-primary text-primary-foreground rounded-lg hover:brightness-110 font-medium transition-[filter,background-color] whitespace-nowrap active:scale-100"
      >
        <UserPlus className="h-4 w-4 shrink-0" />
        Provision User
      </Link>
      {allowBulk ? (
        <Link
          href={bulkHref}
          className="inline-flex items-center justify-center gap-2 min-h-11 px-4 py-2.5 rounded-lg border border-border bg-card text-foreground font-medium hover:bg-muted transition-colors whitespace-nowrap active:scale-100"
        >
          <FileSpreadsheet className="h-4 w-4 shrink-0" />
          Bulk Invite (CSV)
        </Link>
      ) : null}
    </div>
  );
}
