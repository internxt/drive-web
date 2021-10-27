import httpService from '../../core/services/http.service';

export async function getOpenpgp() {
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

export function updateKeys(newPublicKey: string, newPrivateKey: string, newRevocationKey: string): Promise<void> {
  const updatedKeys = {
    publicKey: newPublicKey,
    privateKey: newPrivateKey,
    revocationKey: newRevocationKey,
  };

  return fetch(`${process.env.REACT_APP_API_URL}/api/user/keys`, {
    method: 'PATCH',
    headers: httpService.getHeaders(true, false),
    body: JSON.stringify(updatedKeys),
  }).then();
}
