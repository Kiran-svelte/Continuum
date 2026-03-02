import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  LEAVE_TYPE_CATALOG,
  getDefaultLeaveTypes,
  getLeaveTypesForGender,
  getLeaveTypesByCategory,
  getLeaveTypeByCode,
} from '@/lib/leave-types-config';
import type { LeaveTypeConfig } from '@/lib/leave-types-config';

describe('LEAVE_TYPE_CATALOG', () => {
  it('has 16 leave types defined', () => {
    assert.strictEqual(LEAVE_TYPE_CATALOG.length, 16);
  });

  it('each type has required fields: code, name, defaultQuota, category', () => {
    for (const lt of LEAVE_TYPE_CATALOG) {
      assert.ok(lt.code, `Missing code for leave type`);
      assert.ok(lt.name, `Missing name for ${lt.code}`);
      assert.ok(typeof lt.defaultQuota === 'number', `Missing defaultQuota for ${lt.code}`);
      assert.ok(lt.category, `Missing category for ${lt.code}`);
    }
  });

  it('each type has all expected properties', () => {
    const requiredKeys: (keyof LeaveTypeConfig)[] = [
      'code',
      'name',
      'defaultQuota',
      'carryForward',
      'maxCarryForward',
      'encashmentEnabled',
      'encashmentMaxDays',
      'paid',
      'genderSpecific',
      'category',
      'description',
    ];
    for (const lt of LEAVE_TYPE_CATALOG) {
      for (const key of requiredKeys) {
        assert.ok(key in lt, `${lt.code} missing property: ${key}`);
      }
    }
  });
});

describe('Gender-specific leave types', () => {
  it('ML (Maternity Leave) is female only', () => {
    const ml = getLeaveTypeByCode('ML');
    assert.ok(ml);
    assert.strictEqual(ml.genderSpecific, 'female');
  });

  it('PTL (Paternity Leave) is male only', () => {
    const ptl = getLeaveTypeByCode('PTL');
    assert.ok(ptl);
    assert.strictEqual(ptl.genderSpecific, 'male');
  });

  it('female employees do not get PTL', () => {
    const femaleTypes = getLeaveTypesForGender('female');
    const ptl = femaleTypes.find((lt) => lt.code === 'PTL');
    assert.strictEqual(ptl, undefined);
  });

  it('male employees do not get ML', () => {
    const maleTypes = getLeaveTypesForGender('male');
    const ml = maleTypes.find((lt) => lt.code === 'ML');
    assert.strictEqual(ml, undefined);
  });

  it('female employees get ML', () => {
    const femaleTypes = getLeaveTypesForGender('female');
    const ml = femaleTypes.find((lt) => lt.code === 'ML');
    assert.ok(ml);
  });

  it('male employees get PTL', () => {
    const maleTypes = getLeaveTypesForGender('male');
    const ptl = maleTypes.find((lt) => lt.code === 'PTL');
    assert.ok(ptl);
  });
});

describe('Leave categories', () => {
  it('categories include common, statutory, special, unpaid', () => {
    const categories = [...new Set(LEAVE_TYPE_CATALOG.map((lt) => lt.category))];
    assert.ok(categories.includes('common'));
    assert.ok(categories.includes('statutory'));
    assert.ok(categories.includes('special'));
    assert.ok(categories.includes('unpaid'));
  });

  it('getLeaveTypesByCategory returns correct types for common', () => {
    const common = getLeaveTypesByCategory('common');
    assert.ok(common.length > 0);
    for (const lt of common) {
      assert.strictEqual(lt.category, 'common');
    }
  });

  it('getLeaveTypesByCategory returns correct types for statutory', () => {
    const statutory = getLeaveTypesByCategory('statutory');
    assert.ok(statutory.length > 0);
    const codes = statutory.map((lt) => lt.code);
    assert.ok(codes.includes('ML'));
    assert.ok(codes.includes('PTL'));
    assert.ok(codes.includes('BL'));
  });
});

describe('LWP quota', () => {
  it('LWP has a high quota representing effectively unlimited leave', () => {
    const lwp = getLeaveTypeByCode('LWP');
    assert.ok(lwp);
    // LWP defaultQuota is 365 (a full year)
    assert.strictEqual(lwp.defaultQuota, 365);
    assert.strictEqual(lwp.paid, false);
    assert.strictEqual(lwp.category, 'unpaid');
  });
});

describe('getDefaultLeaveTypes', () => {
  it('returns a copy of the catalog', () => {
    const types = getDefaultLeaveTypes();
    assert.strictEqual(types.length, LEAVE_TYPE_CATALOG.length);
    assert.notStrictEqual(types, LEAVE_TYPE_CATALOG); // should be a copy
  });
});

describe('getLeaveTypeByCode', () => {
  it('finds CL by code', () => {
    const cl = getLeaveTypeByCode('CL');
    assert.ok(cl);
    assert.strictEqual(cl.name, 'Casual Leave');
  });

  it('returns undefined for unknown code', () => {
    const result = getLeaveTypeByCode('UNKNOWN');
    assert.strictEqual(result, undefined);
  });
});
