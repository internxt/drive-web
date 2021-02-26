export async function generateNewKeys() {
  const { privateKeyArmored, publicKeyArmored, revocationCertificate } = await openpgp.generateKey({
    userIds: [{ email: 'inxt@inxt.com' }],
    curve: 'ed25519'
  });

  return {
    privateKeyArmored,
    publicKeyArmored: Buffer.from(publicKeyArmored).toString('base64'),
    revocationCertificate: Buffer.from(revocationCertificate).toString('base64')
  };
}
