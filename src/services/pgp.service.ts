import openpgp from 'openpgp';
import { getHeaders } from '../lib/auth';

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

export function updateKeys(newPublicKey, newPrivateKey, newRevocationKey) {
  const updatedKeys = {
    publicKey: newPublicKey,
    privateKey: newPrivateKey,
    revocationKey: newRevocationKey
  };

  return fetch('/api/user/keys', {
    method: 'PATCH',
    headers: getHeaders(true, false),
    body: JSON.stringify(updatedKeys)
  });
}