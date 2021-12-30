export async function getOpenpgp(): Promise<typeof import('openpgp')> {
  return import('openpgp');
}

export async function generateNewKeys(): Promise<{
  privateKeyArmored: string;
  publicKeyArmored: string;
  revocationCertificate: string;
}> {
  const openpgp = await getOpenpgp();
  const { privateKeyArmored, publicKeyArmored, revocationCertificate } = await openpgp.generateKey({
    userIds: [{ email: 'inxt@inxt.com' }],
    curve: 'ed25519',
  });

  return {
    privateKeyArmored,
    publicKeyArmored: Buffer.from(publicKeyArmored).toString('base64'),
    revocationCertificate: Buffer.from(revocationCertificate).toString('base64'),
  };
}
