import { describe, expect, test, vi, beforeEach, afterEach } from 'vitest';
import { cropSharedName, isAdvancedShareItem, getLocalUserData, filterEditorAndReader } from '.';
import { localStorageService } from 'services';
import { DriveItemData } from 'app/drive/types';
import { AdvancedSharedItem } from 'app/share/types';
import { Role } from '@internxt/sdk/dist/drive/share/types';

describe('Cropping the name', () => {
  test('When name length is less than max length, then returns original name', () => {
    const name = 'Short Name';

    const result = cropSharedName(name);

    expect(result).toBe('Short Name');
  });

  test('When name length equals max length (32), then returns original name', () => {
    const name = 'a'.repeat(32);

    const result = cropSharedName(name);

    expect(result).toBe(name);
  });

  test('When name length exceeds max length, then returns cropped name with ellipsis', () => {
    const name = 'This is a very long name that exceeds the maximum allowed length';

    const result = cropSharedName(name);

    expect(result).not.toBe(name);
    expect(result.endsWith('...')).toBe(true);
    expect(result.length).toBeLessThan(name.length);
    expect(result.startsWith(name.substring(0, 10))).toBe(true);
  });

  test('When name is exactly 33 characters, then crops to 32 characters plus ellipsis', () => {
    const name = 'a'.repeat(33);

    const result = cropSharedName(name);

    expect(result).not.toBe(name);
    expect(result.endsWith('...')).toBe(true);
    expect(result.length).toBe(35);
    expect(result.startsWith('a'.repeat(32))).toBe(true);
  });
});

describe('Check if it is an advanced share item', () => {
  test('When item has an encryption key property, then returns truthy value', () => {
    const item = {
      id: '123',
      encryptionKey: 'some-key',
      name: 'Test Item',
    } as unknown as AdvancedSharedItem;

    const result = isAdvancedShareItem(item);

    expect(result).toBeTruthy();
  });

  test('When item does not have an encryption key property, then returns falsy value', () => {
    const item = {
      id: '123',
      name: 'Test Item',
    } as unknown as DriveItemData;

    const result = isAdvancedShareItem(item);

    expect(result).toBeFalsy();
  });

  test('When item has an encryption key with undefined value, then returns falsy value', () => {
    const item = {
      id: '123',
      encryptionKey: undefined,
      name: 'Test Item',
    } as any;

    const result = isAdvancedShareItem(item);

    expect(result).toBeFalsy();
  });
});

describe('Get the local user data', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  test('When user data exists in local storage, then returns formatted owner data', () => {
    const mockUser = {
      name: 'John',
      lastname: 'Doe',
      email: 'john@example.com',
      avatar: 'avatar-url',
      uuid: 'user-uuid-123',
    } as any;
    vi.spyOn(localStorageService, 'getUser').mockReturnValue(mockUser);

    const result = getLocalUserData();

    expect(result).toEqual({
      name: 'John',
      lastname: 'Doe',
      email: 'john@example.com',
      sharingId: '',
      avatar: 'avatar-url',
      uuid: 'user-uuid-123',
      role: {
        id: 'NONE',
        name: 'OWNER',
        createdAt: '',
        updatedAt: '',
      },
    });
  });

  test('When user has no avatar, then returns owner data with null avatar', () => {
    const mockUser = {
      name: 'Bob',
      lastname: 'Johnson',
      email: 'bob@example.com',
      avatar: null,
      uuid: 'user-uuid-789',
    } as any;
    vi.spyOn(localStorageService, 'getUser').mockReturnValue(mockUser);

    const result = getLocalUserData();

    expect(result.avatar).toBeNull();
  });
});

describe('Filtering roles by EDITOR and READER', () => {
  test('When roles array contains only EDITOR and READER, then returns all roles', () => {
    const roles: Role[] = [
      { id: '1', name: 'EDITOR', createdAt: new Date('2024-01-01'), updatedAt: new Date('2024-01-01') },
      { id: '2', name: 'READER', createdAt: new Date('2024-01-01'), updatedAt: new Date('2024-01-01') },
    ];

    const result = filterEditorAndReader(roles);

    expect(result).toHaveLength(2);
    expect(result).toEqual(roles);
  });

  test('When roles array contains OWNER, then filters it out', () => {
    const roles: Role[] = [
      { id: '1', name: 'OWNER', createdAt: new Date('2024-01-01'), updatedAt: new Date('2024-01-01') },
      { id: '2', name: 'EDITOR', createdAt: new Date('2024-01-01'), updatedAt: new Date('2024-01-01') },
      { id: '3', name: 'READER', createdAt: new Date('2024-01-01'), updatedAt: new Date('2024-01-01') },
    ];

    const result = filterEditorAndReader(roles);

    expect(result).toHaveLength(2);
    expect(result.every((role) => role.name === 'EDITOR' || role.name === 'READER')).toBe(true);
  });

  test('When roles array is empty, then returns empty array', () => {
    const roles: Role[] = [];

    const result = filterEditorAndReader(roles);

    expect(result).toHaveLength(0);
    expect(result).toEqual([]);
  });

  test('When roles array contains no EDITOR or READER, then returns empty array', () => {
    const roles: Role[] = [
      { id: '1', name: 'OWNER', createdAt: new Date('2024-01-01'), updatedAt: new Date('2024-01-01') },
      { id: '2', name: 'ADMIN', createdAt: new Date('2024-01-01'), updatedAt: new Date('2024-01-01') },
    ];

    const result = filterEditorAndReader(roles);

    expect(result).toHaveLength(0);
  });
});
