import { redirect } from 'next/navigation';

/** Legacy People Operations list — canonical surface is My Team. */
export default function ManagerPeopleRedirectPage() {
  redirect('/manager/team');
}
