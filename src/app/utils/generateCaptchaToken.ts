import envService from 'app/core/services/env.service';

export async function generateCaptchaToken(): Promise<string> {
  await new Promise<void>((r) => window.grecaptcha.ready(r));
  const captcha = await window.grecaptcha.execute(envService.getVariable('recaptchaV3'), {
    action: 'authentication',
  });

  return captcha;
}
