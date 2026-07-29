import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import envService from '../services/env.service';

vi.mock('../services/env.service');

type TurnstileOptions = {
  sitekey: string;
  action?: string;
  execution?: string;
  appearance?: string;
  callback?: (token: string) => void;
  'error-callback'?: (error?: string) => void;
  'expired-callback'?: () => void;
};

describe('generateTurnstileToken', () => {
  const mockTurnstileSiteKey = 'test-turnstile-site-key';
  const mockTurnstileToken = 'mock-turnstile-token-123';
  const mockWidgetId = 'widget-1';

  const buildTurnstileMock = (onRender?: (options: TurnstileOptions) => string | undefined) => ({
    render: vi.fn((_container: string | HTMLElement, options: TurnstileOptions) => onRender?.(options)),
    execute: vi.fn(),
    getResponse: vi.fn(),
    isExpired: vi.fn(),
    reset: vi.fn(),
    remove: vi.fn(),
  });

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(envService.getVariable).mockReturnValue(mockTurnstileSiteKey);
  });

  afterEach(() => {
    delete (globalThis as { turnstile?: unknown }).turnstile;
  });

  it('should return the token issued by Cloudflare when the challenge is solved', async () => {
    globalThis.turnstile = buildTurnstileMock((options) => {
      options.callback?.(mockTurnstileToken);
      return mockWidgetId;
    }) as never;

    const { generateTurnstileToken } = await import('./generateTurnstileToken');
    const token = await generateTurnstileToken();

    expect(token).toBe(mockTurnstileToken);
    expect(envService.getVariable).toHaveBeenCalledWith('turnstileSiteKey');
    expect(globalThis.turnstile?.render).toHaveBeenCalledWith(
      expect.any(HTMLDivElement),
      expect.objectContaining({ sitekey: mockTurnstileSiteKey, action: 'checkout', execution: 'execute' }),
    );
  });

  it('should ask Cloudflare to run the challenge when the widget is mounted successfully', async () => {
    let renderOptions: TurnstileOptions | undefined;
    globalThis.turnstile = buildTurnstileMock((options) => {
      renderOptions = options;
      return mockWidgetId;
    }) as never;

    const { generateTurnstileToken } = await import('./generateTurnstileToken');
    const tokenPromise = generateTurnstileToken();

    expect(globalThis.turnstile?.execute).toHaveBeenCalledWith(mockWidgetId);

    renderOptions?.callback?.(mockTurnstileToken);

    await expect(tokenPromise).resolves.toBe(mockTurnstileToken);
  });

  it('should let the checkout continue without a token when the widget reports an error', async () => {
    globalThis.turnstile = buildTurnstileMock((options) => {
      options['error-callback']?.();
      return mockWidgetId;
    }) as never;

    const { generateTurnstileToken } = await import('./generateTurnstileToken');

    await expect(generateTurnstileToken()).resolves.toBeUndefined();
  });

  it('should let the checkout continue without a token when the challenge expires before being read', async () => {
    globalThis.turnstile = buildTurnstileMock((options) => {
      options['expired-callback']?.();
      return mockWidgetId;
    }) as never;

    const { generateTurnstileToken } = await import('./generateTurnstileToken');

    await expect(generateTurnstileToken()).resolves.toBeUndefined();
  });

  it('should let the checkout continue without a token when the widget cannot be mounted', async () => {
    globalThis.turnstile = buildTurnstileMock(() => undefined) as never;

    const { generateTurnstileToken } = await import('./generateTurnstileToken');

    await expect(generateTurnstileToken()).resolves.toBeUndefined();
    expect(globalThis.turnstile?.execute).not.toHaveBeenCalled();
  });

  it('should let the checkout continue without a token when the Turnstile script is not available', async () => {
    const { generateTurnstileToken } = await import('./generateTurnstileToken');

    await expect(generateTurnstileToken()).resolves.toBeUndefined();
  });

  it('should let the checkout continue without a token when no site key is configured', async () => {
    vi.mocked(envService.getVariable).mockReturnValue('');
    globalThis.turnstile = buildTurnstileMock(() => mockWidgetId) as never;

    const { generateTurnstileToken } = await import('./generateTurnstileToken');

    await expect(generateTurnstileToken()).resolves.toBeUndefined();
    expect(globalThis.turnstile?.render).not.toHaveBeenCalled();
  });

  it('should give up without a token when Cloudflare never answers the challenge', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    globalThis.turnstile = buildTurnstileMock(() => mockWidgetId) as never;

    const { generateTurnstileToken } = await import('./generateTurnstileToken');
    const tokenPromise = generateTurnstileToken();
    await vi.advanceTimersByTimeAsync(10000);

    await expect(tokenPromise).resolves.toBeUndefined();
    vi.useRealTimers();
  });

  it('should tear down the widget and its container once the challenge settles', async () => {
    globalThis.turnstile = buildTurnstileMock((options) => {
      options.callback?.(mockTurnstileToken);
      return mockWidgetId;
    }) as never;

    const { generateTurnstileToken } = await import('./generateTurnstileToken');
    await generateTurnstileToken();

    const [mountedContainer] = vi.mocked(globalThis.turnstile!.render).mock.calls[0];

    expect(globalThis.turnstile?.remove).toHaveBeenCalledWith(mockWidgetId);
    expect((mountedContainer as HTMLElement).isConnected).toBe(false);
  });
});
