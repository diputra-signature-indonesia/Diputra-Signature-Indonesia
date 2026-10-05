import assert from 'node:assert/strict';
import { test } from 'node:test';
import { canChangeMyTaskStatus } from '../../src/lib/admin-my-tasks/task-permissions.ts';

const base = { role: 'staff', actorId: 'actor', picId: 'pic', assigneeId: 'assignee', jobStatusCode: 'IN_PROGRESS' };
test('only PIC, assignee, admin, or super admin can change task status', () => {
  assert.equal(canChangeMyTaskStatus(base), false);
  assert.equal(canChangeMyTaskStatus({ ...base, actorId: 'pic' }), true);
  assert.equal(canChangeMyTaskStatus({ ...base, actorId: 'assignee' }), true);
  assert.equal(canChangeMyTaskStatus({ ...base, role: 'admin' }), true);
  assert.equal(canChangeMyTaskStatus({ ...base, role: 'super_admin' }), true);
  assert.equal(canChangeMyTaskStatus({ ...base, assigneeId: null }), false);
});
test('completed and archived jobs are read-only for every role', () => {
  for (const role of ['staff', 'admin', 'super_admin']) {
    const input = { ...base, role, actorId: 'pic' };
    assert.equal(canChangeMyTaskStatus({ ...input, jobStatusCode: 'COMPLETED' }), false);
    assert.equal(canChangeMyTaskStatus({ ...input, archived: true }), false);
  }
});
