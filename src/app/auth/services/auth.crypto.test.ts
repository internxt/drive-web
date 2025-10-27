import { describe, expect, it } from 'vitest';
import { generateUserSecrets, encryptUserKeysAndMnemonic, decryptUserKeysAndMnemonic } from './auth.crypto';

describe('Test auth crypto functions', () => {
  it('should sucessfully encrypt and decrypt user keys and mnemonic', async () => {
    const { keys, mnemonic } = await generateUserSecrets();
    const exportKey = 'Srp6AzybbyludWuaVwGoHa1C2H0Qtv7JR0sKGLSWe8Ho8_q9hezfYD2RYb9IUrW999pH4VlABgDLse484zAapg';

    const { encMnemonic, encKeys } = await encryptUserKeysAndMnemonic(keys, mnemonic, exportKey);

    const { keys: dec_keys, mnemonic: dec_mnemonic } = await decryptUserKeysAndMnemonic(
      encMnemonic,
      encKeys,
      exportKey,
    );

    expect(keys).toStrictEqual(dec_keys);
    expect(mnemonic).toEqual(dec_mnemonic);
  });
});
