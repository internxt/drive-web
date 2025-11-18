import envService from 'services/env.service';

export async function generateCaptchaToken(): Promise<string> {
  await new Promise<void>((r) => globalThis.grecaptcha.ready(r));
  const captcha = await globalThis.grecaptcha.execute(envService.getVariable('recaptchaV3'), {
    action: 'authentication',
  });

  return captcha;
}
