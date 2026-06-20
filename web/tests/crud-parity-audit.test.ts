import { describe, it } from 'node:test';
import assert from 'node:assert';
import { fileURLToPath } from 'node:url';

async function readSource(relativePath: string): Promise<string> {
  const fs = await import('node:fs');
  const path = fileURLToPath(new URL(relativePath, import.meta.url));
  return fs.readFileSync(path, 'utf-8');
}

describe('CRUD parity audit guards', () => {
  it('super-admin users page should delegate to UsersView with invite management', async () => {
    const page = await readSource('../app/super-admin/users/page.tsx');
    const view = await readSource('../components/pages/super-admin/users-view.tsx');

    assert.ok(page.includes("UsersView"), 'Users page should re-export UsersView');
    assert.ok(view.includes('resendInviteAction') && view.includes('revokeInviteAction'));
    assert.ok(view.includes('deactivateUserAction'));
    assert.ok(view.includes('ConfirmFormButton'));
    assert.ok(view.includes('/super-admin/users/invites/${invite.id}'));
  });

  it('super-admin invite API should support revoke', async () => {
    const api = await readSource('../app/api/super-admin/user-invites/[id]/route.ts');
    assert.ok(api.includes('export async function DELETE'));
    assert.ok(api.includes("status: 'revoked'"));
  });

  it('company invite API should allow manager-scoped management', async () => {
    const api = await readSource('../app/api/company/invite-user/[id]/route.ts');
    assert.ok(api.includes('canManageCompanyInvite'));
    assert.ok(api.includes('manager_id === user.id'));
  });

  it('admin people table should expose view and deactivate actions', async () => {
    const table = await readSource('../app/admin/(main)/people/people-table.tsx');
    assert.ok(table.includes('/hr/employees/${user.id}'));
    assert.ok(table.includes('ConfirmDialog'));
    assert.ok(table.includes("method: 'DELETE'"));
  });

  it('pending invite actions component should support resend and revoke', async () => {
    const component = await readSource('../components/invite/pending-invite-actions.tsx');
    assert.ok(component.includes("method: 'POST'"));
    assert.ok(component.includes("method: 'DELETE'"));
    assert.ok(component.includes('ConfirmDialog'));
  });

  it('HR and admin invite views should list company user invites with actions', async () => {
    const hrInvite = await readSource('../components/pages/hr/employees-invite-view.tsx');
    const adminInvite = await readSource('../components/pages/admin/people-invite-view.tsx');

    assert.ok(hrInvite.includes('/api/company/invite-user'));
    assert.ok(hrInvite.includes('PendingInviteActions'));
    assert.ok(adminInvite.includes('PendingInviteActions'));
  });

  it('super-admin user credentials editor should support deactivate', async () => {
    const editor = await readSource('../components/super-admin/user-credentials-editor.tsx');
    assert.ok(editor.includes("method: 'DELETE'"));
    assert.ok(editor.includes('ConfirmDialog'));
  });
});
