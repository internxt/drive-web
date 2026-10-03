import type { TurnstileInstance, TurnstileProps } from '@marsidev/react-turnstile';
import { act, render } from '@testing-library/react';
import { createRef, forwardRef, useImperativeHandle } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import envService from 'services/env.service';
import TurnstileWidget, { TurnstileWidgetHandle } from './TurnstileWidget';

vi.mock('services/env.service');

const widget = { reset: vi.fn(), execute: vi.fn(), getResponsePromise: vi.fn() };
let widgetProps: TurnstileProps | undefined;

vi.mock('@marsidev/react-turnstile', () => ({
  Turnstile: forwardRef<TurnstileInstance | undefined, TurnstileProps>((props, ref) => {
    widgetProps = props;
    useImperativeHandle(ref, () => widget as unknown as TurnstileInstance);
    return <div data-testid="turnstile" />;
  }),
}));

const SITE_KEY = '1x00000000000000000000AA';
const TOKEN = 'XXXX.DUMMY.TOKEN.XXXX';

describe('TurnstileWidget', () => {
  const mockEnv = ({ enabled = 'true', siteKey = SITE_KEY } = {}) => {
    vi.mocked(envService.getVariable).mockImplementation((variable) => {
      if (variable === 'turnstileEnabled') return enabled;
      if (variable === 'turnstileSiteKey') return siteKey;
      return '';
    });
  };

  const renderTurnstile = () => {
    const ref = createRef<TurnstileWidgetHandle>();
    const view = render(<TurnstileWidget ref={ref} action="login" />);
    return { ...view, getToken: () => ref.current?.getToken() };
  };

  beforeEach(() => {
    vi.clearAllMocks();
    widgetProps = undefined;
  });

  it('When the flag is disabled, then no widget is rendered and no token is returned', async () => {
    mockEnv({ enabled: 'false' });

    const { queryByTestId, getToken } = renderTurnstile();

    expect(queryByTestId('turnstile')).toBeNull();
    expect(await getToken()).toBeUndefined();
    expect(widget.execute).not.toHaveBeenCalled();
  });

  it('When there is no site key, then no widget is rendered and no token is returned', async () => {
    mockEnv({ siteKey: '' });

    const { queryByTestId, getToken } = renderTurnstile();

    expect(queryByTestId('turnstile')).toBeNull();
    expect(await getToken()).toBeUndefined();
  });

  it('When enabled, then the widget waits for an explicit execute before resolving the challenge', () => {
    mockEnv();

    const { getByTestId } = renderTurnstile();

    expect(getByTestId('turnstile')).toBeInTheDocument();
    expect(widgetProps).toMatchObject({
      siteKey: SITE_KEY,
      options: { execution: 'execute', action: 'login', appearance: 'interaction-only' },
    });
  });

  it('When a token is requested, then it resets and executes a fresh challenge', async () => {
    mockEnv();
    widget.getResponsePromise.mockResolvedValue(TOKEN);

    const { getToken } = renderTurnstile();

    expect(await getToken()).toBe(TOKEN);
    expect(widget.reset).toHaveBeenCalledTimes(2);
    expect(widget.execute).toHaveBeenCalledTimes(1);
  });

  it('When requested again, then it forces a fresh challenge every time', async () => {
    mockEnv();
    widget.getResponsePromise.mockResolvedValue(TOKEN);

    const { getToken } = renderTurnstile();

    await getToken();
    await getToken();

    expect(widget.execute).toHaveBeenCalledTimes(2);
  });

  it('When the widget fails or times out, then it stays visible so the user can retry', async () => {
    mockEnv();
    widget.getResponsePromise.mockRejectedValue(new Error('timeout'));

    const { getToken } = renderTurnstile();

    expect(await getToken()).toBeUndefined();
  });

  it('When idle, then the widget stays hidden and takes up no space', () => {
    mockEnv();

    const { getByTestId } = renderTurnstile();

    expect(getByTestId('turnstile').parentElement).toHaveClass('hidden');
  });

  it('When the challenge needs user interaction, then the widget becomes visible', () => {
    mockEnv();

    const { getByTestId } = renderTurnstile();

    act(() => widgetProps?.onBeforeInteractive?.());

    expect(getByTestId('turnstile').parentElement).not.toHaveClass('hidden');
  });

  it('When a token is obtained after an interactive challenge, then the wrapper collapses again', async () => {
    mockEnv();
    widget.getResponsePromise.mockResolvedValue(TOKEN);

    const { getByTestId, getToken } = renderTurnstile();
    act(() => widgetProps?.onBeforeInteractive?.());

    await act(async () => {
      await getToken();
    });

    expect(getByTestId('turnstile').parentElement).toHaveClass('hidden');
  });
});
