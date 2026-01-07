import { describe, it, expect } from 'vitest';
import * as opaque from '@serenity-kit/opaque';
import { encryptUserKeysAndMnemonic, generateUserSecrets } from './auth.crypto';

describe('Opaque registration record geenration', () => {
  const password = 'test123.';
  const email = 'testbusiness05@inxt.com';

  const serverSetup =
    'awirun08Dxx3yBpGdd0W2-j4Tl5ip02M5Uu7EVRhtqUzEEdW5EhlP1QC1z3UX8hB7cavoCyem4Kl0iCymdTsbk_tbiJu8-zzrWF3S1nQ2cGY5TkDXIatNKh5riaw7xINwkTOycgxvsIENsPn2W19OgAw2_Zih_1f4Px6ncj7-iw';

  it('should generate registration record', async () => {
    const { clientRegistrationState, registrationRequest } = opaque.client.startRegistration({ password });
    const { registrationResponse } = opaque.server.createRegistrationResponse({
      serverSetup,
      userIdentifier: email,
      registrationRequest,
    });
    const { registrationRecord } = opaque.client.finishRegistration({
      clientRegistrationState,
      registrationResponse,
      password,
    });
    console.log('Registration record', registrationRecord);
    expect(registrationRecord).toBeDefined();
  });
  it('should encrypt keys', async () => {
    const registrationRecord =
      'jIbcZt2Zb4N8NuIZngBA7qphxYxdFCxxI-8fxIWEoymmbwcQRv2ywpR8sCR2UTxrzQFOyb-dhXcmFXQB4TQEurIaij2sRYNaTc08uaP60PuXAbMvjCXMmSUe3VuO_Krgpaz6ZvqvwCuoPumIhSJqk47YhbVnJ924kqSjzFjR5CwiZhYqLw8dTFvni83FiATYNw3isf3ezrqksx23IlxatOWjU9ob4DnXtTLW3luy9brspfHzlqhTWZZY6Qc2VIlg';
    const { clientLoginState, startLoginRequest } = opaque.client.startLogin({
      password,
    });
    const { loginResponse, serverLoginState } = opaque.server.startLogin({
      userIdentifier: email,
      registrationRecord,
      serverSetup,
      startLoginRequest,
    });
    const loginResult = opaque.client.finishLogin({
      clientLoginState,
      loginResponse,
      password,
    });
    if (!loginResult) {
      throw new Error('no login results');
    }
    const { exportKey, finishLoginRequest, sessionKey } = loginResult;

    const { sessionKey: sessionKeyServer } = opaque.server.finishLogin({
      finishLoginRequest,
      serverLoginState,
    });
    expect(sessionKey).toBe(sessionKeyServer);
    const { keys, mnemonic } = await generateUserSecrets();

    const { encKeys, encMnemonic } = await encryptUserKeysAndMnemonic(keys, mnemonic, exportKey);
    console.log('Encrypted keys', encKeys);
    console.log('Encrypted mnemonic', encMnemonic);
    const expectedKey = 'dnFsRmZwILu2tNDqVdJll6KYBDQziZvTWuw7uX8JSmZLveqQtuU1UO9qs5toXMakNsqmDHBJlnOlq52FG78IXw';
    expect(encKeys).toBeDefined();
    expect(encMnemonic).toBeDefined();
    expect(exportKey).toBe(expectedKey);
  });
});
