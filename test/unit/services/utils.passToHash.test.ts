import { describe, expect, it } from 'vitest';
import { passToHash } from '../../../src/app/crypto/services/utils';

describe('Test password hashing', () => {
  it('should generate the same hash for the same salt', async () => {
    const mockPassword = 'test-password';
    const hashObj = passToHash({ password: mockPassword });
    const salt = hashObj.salt;
    const hashedPassword = passToHash({ password: mockPassword, salt }).hash;
    expect(hashObj.hash).toStrictEqual(hashedPassword);
  });

  it('should generate the new hash for the new salt', async () => {
    const mockPassword = 'test-password';
    const hashObj1 = passToHash({ password: mockPassword });
    const hashObj2 = passToHash({ password: mockPassword });
    expect(hashObj1.salt).not.toStrictEqual(hashObj2.salt);
    expect(hashObj1.hash).not.toStrictEqual(hashObj2.hash);
  });

  it('should verify pre-defined hash', async () => {
    const mockPassword = 'test-password';
    const preDefinedHash = 'ef8eb653e34e31c19a6d4e3347bb0711306ed5d24b4479c4c4977d5f5cbbd2b5';
    const preDefinedSalt = 'f460f2d2da407c831e38287af68098b5';
    const hashedPassword = passToHash({ password: mockPassword, salt: preDefinedSalt }).hash;
    expect(hashedPassword).toStrictEqual(preDefinedHash);
  });
});
