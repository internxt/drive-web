import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import envService from 'services/env.service';
import useTurnstile from './useTurnstile';

vi.mock('services/env.service');

const ALWAYS_PASSES_SITE_KEY = '1x00000000000000000000AA';
const DUMMY_TOKEN = 'XXXX.DUMMY.TOKEN.XXXX';

describe('useTurnstile', () => {
  const mockEnv = ({ enabled = 'true', siteKey = ALWAYS_PASSES_SITE_KEY } = {}) => {
    vi.mocked(envService.getVariable).mockImplementation((variable) => {
      if (variable === 'turnstileEnabled') return enabled;
      if (variable === 'turnstileSiteKey') return siteKey;
      return '';
    });
  };

  const mockTurnstile = () => {
    const options: Record<string, unknown> = {};

    globalThis.turnstile = {
      render: vi.fn((_el, opts) => {
        Object.assign(options, opts);
        return 'widget-1';
      }),
      execute: vi.fn(),
      reset: vi.fn(),
      remove: vi.fn(),
    };

    return {
      succeed: (token: string) => (options.callback as (t: string) => void)(token),
      fail: () => (options['error-callback'] as () => void)(),
      timeout: () => (options['timeout-callback'] as () => void)(),
    };
  };

  const renderTurnstile = () => renderHook(() => useTurnstile());

  beforeEach(() => {
    vi.clearAllMocks();
    globalThis.turnstile = undefined;
    document.getElementById('cf-turnstile-script')?.remove();
  });

  it('When the flag is disabled, then the widget is not rendered and no token is returned', async () => {
    mockEnv({ enabled: 'false' });
    mockTurnstile();

    const { result } = renderTurnstile();

    expect(await result.current.getToken()).toBeUndefined();
    expect(globalThis.turnstile?.render).not.toHaveBeenCalled();
    expect(document.getElementById('cf-turnstile-script')).toBeNull();
  });

  it('When there is no site key, then the widget is not rendered and no token is returned', async () => {
    mockEnv({ siteKey: '' });
    mockTurnstile();

    const { result } = renderTurnstile();

    expect(await result.current.getToken()).toBeUndefined();
    expect(globalThis.turnstile?.render).not.toHaveBeenCalled();
  });

  it('When a token is requested, then the widget is rendered as invisible and resolves with the token', async () => {
    mockEnv();
    const widget = mockTurnstile();

    const { result } = renderTurnstile();

    await waitFor(() => expect(globalThis.turnstile?.render).toHaveBeenCalled());
    expect(globalThis.turnstile?.render).toHaveBeenCalledWith(
      expect.any(HTMLElement),
      expect.objectContaining({ sitekey: ALWAYS_PASSES_SITE_KEY, action: 'login', execution: 'execute' }),
    );

    const pendingToken = result.current.getToken();
    await waitFor(() => expect(globalThis.turnstile?.execute).toHaveBeenCalled());
    widget.succeed(DUMMY_TOKEN);

    expect(await pendingToken).toBe(DUMMY_TOKEN);
  });

  it('When a token is requested twice, then the widget is reset so the second token is fresh', async () => {
    mockEnv();
    const widget = mockTurnstile();

    const { result } = renderTurnstile();
    await waitFor(() => expect(globalThis.turnstile?.render).toHaveBeenCalled());

    const firstToken = result.current.getToken();
    await waitFor(() => expect(globalThis.turnstile?.execute).toHaveBeenCalledTimes(1));
    widget.succeed(`${DUMMY_TOKEN}.1`);
    expect(await firstToken).toBe(`${DUMMY_TOKEN}.1`);

    const secondToken = result.current.getToken();
    await waitFor(() => expect(globalThis.turnstile?.execute).toHaveBeenCalledTimes(2));
    widget.succeed(`${DUMMY_TOKEN}.2`);
    expect(await secondToken).toBe(`${DUMMY_TOKEN}.2`);

    expect(globalThis.turnstile?.render).toHaveBeenCalledTimes(1);
    expect(globalThis.turnstile?.reset).toHaveBeenCalledWith('widget-1');
  });

  it('When the widget reports an error, then no token is returned', async () => {
    mockEnv();
    const widget = mockTurnstile();

    const { result } = renderTurnstile();
    await waitFor(() => expect(globalThis.turnstile?.render).toHaveBeenCalled());

    const pendingToken = result.current.getToken();
    await waitFor(() => expect(globalThis.turnstile?.execute).toHaveBeenCalled());
    widget.fail();

    expect(await pendingToken).toBeUndefined();
  });

  it('When the widget times out, then no token is returned', async () => {
    mockEnv();
    const widget = mockTurnstile();

    const { result } = renderTurnstile();
    await waitFor(() => expect(globalThis.turnstile?.render).toHaveBeenCalled());

    const pendingToken = result.current.getToken();
    await waitFor(() => expect(globalThis.turnstile?.execute).toHaveBeenCalled());
    widget.timeout();

    expect(await pendingToken).toBeUndefined();
  });

  it('When the script fails to load, then no token is returned', async () => {
    mockEnv();

    const { result } = renderTurnstile();

    await waitFor(() => expect(document.getElementById('cf-turnstile-script')).not.toBeNull());
    const pendingToken = result.current.getToken();
    document.getElementById('cf-turnstile-script')?.dispatchEvent(new Event('error'));

    expect(await pendingToken).toBeUndefined();
  });

  it('When the hook unmounts, then the widget is removed', async () => {
    mockEnv();
    mockTurnstile();

    const { unmount } = renderTurnstile();
    await waitFor(() => expect(globalThis.turnstile?.render).toHaveBeenCalled());

    unmount();

    expect(globalThis.turnstile?.remove).toHaveBeenCalledWith('widget-1');
  });
});
