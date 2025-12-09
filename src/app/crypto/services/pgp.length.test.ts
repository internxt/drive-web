import { encryptTextWithKey } from 'app/crypto/services/utils';
import { getKeys } from 'app/crypto/services/keys.service';
import { mnemonicToEntropy, entropyToMnemonic, generateMnemonic } from 'bip39';
import envService from 'services/env.service';
import { describe, expect, it, vi, beforeEach } from 'vitest';

describe('Test crypto.ts functions', () => {
  globalThis.Buffer = Buffer;

  const mockMagicIv = '12345678912345678912345678912345';
  const mockMagicSalt =
    '00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000';

  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    vi.spyOn(envService, 'getVariable').mockImplementation((key) => {
      if (key === 'magicIv') return mockMagicIv;
      if (key === 'magicSalt') return mockMagicSalt;
      else return 'no mock implementation';
    });
  });

  it('check generated keys length', async () => {
    const password = 'test password';
    const keys = await getKeys(password);

    expect(keys.kyber.publicKey?.length).toBe(1068);
    expect(keys.kyber.privateKeyEncrypted?.length).toBe(3032);
    expect(keys.ecc.publicKey?.length).toBeGreaterThanOrEqual(816);
    expect(keys.ecc.privateKeyEncrypted?.length).toBeGreaterThanOrEqual(1084);
  });

  it('convert mnemonic to seed and back', async () => {
    const mnemonic = await generateMnemonic(256);
    const seed = await mnemonicToEntropy(mnemonic);

    expect(seed.length).toBe(64);
    const mnemonicFromSeed = await entropyToMnemonic(seed);

    expect(mnemonic).toBe(mnemonicFromSeed);
  });

  it('check max and min encrypted mnemonic length', async () => {
    const mnemonicMax = Array(24).fill('kangaroo').join(' ');
    expect(mnemonicMax.length).toBe(215);
    const mnemonicMin = Array(24).fill('able').join(' ');
    expect(mnemonicMin.length).toBe(119);
    const pwd = 'test password';

    const encryptedMnemonicMax = encryptTextWithKey(mnemonicMax, pwd);
    const encryptedMnemonicMin = encryptTextWithKey(mnemonicMin, pwd);

    expect(encryptedMnemonicMax.length).toBe(480);
    expect(encryptedMnemonicMin.length).toBe(288);
  });

  it('check encrypted mnemonic length', async () => {
    const mnemonic = generateMnemonic(256);
    const pwd = 'test password';

    const encryptedMnemonic = encryptTextWithKey(mnemonic, pwd);

    expect(encryptedMnemonic.length).toBeLessThanOrEqual(480);
    expect(encryptedMnemonic.length).toBeGreaterThanOrEqual(288);
  });
});
