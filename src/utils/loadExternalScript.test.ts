import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

let loadExternalScript: typeof import('./loadExternalScript').loadExternalScript;

const TEST_SCRIPT_BASE = 'https://test-cdn.example.com';
let scriptCounter = 0;

const uniqueSrc = () => `${TEST_SCRIPT_BASE}/script-${++scriptCounter}.js`;

const findAllTestScripts = (): HTMLScriptElement[] =>
  Array.from(document.head.querySelectorAll(`script[src^="${TEST_SCRIPT_BASE}"]`));

const getScript = (src: string): HTMLScriptElement => {
  const script = document.head.querySelector<HTMLScriptElement>(`script[src="${src}"]`);
  if (!script) throw new Error(`Expected script with src="${src}" to be in the DOM`);
  return script;
};

describe('loadExternalScript', () => {
  beforeEach(async () => {
    findAllTestScripts().forEach((s) => s.remove());

    vi.resetModules();
    const module = await import('./loadExternalScript');
    loadExternalScript = module.loadExternalScript;
  });

  afterEach(() => {
    findAllTestScripts().forEach((s) => s.remove());
  });

  it('when a script is requested, then a module script tag is appended to the head', async () => {
    const src = uniqueSrc();

    const promise = loadExternalScript(src);

    const script = getScript(src);
    expect(script.type).toBe('module');
    expect(script.async).toBe(true);

    script.onload?.(new Event('load'));
    await promise;
  });

  it('when the script loads successfully, then the promise resolves', async () => {
    const src = uniqueSrc();
    const promise = loadExternalScript(src);

    getScript(src).onload?.(new Event('load'));

    await expect(promise).resolves.toBeUndefined();
  });

  it('when the script fails to load, then the promise rejects with the script URL', async () => {
    const src = uniqueSrc();
    const promise = loadExternalScript(src);

    getScript(src).onerror?.(new Event('error'));

    await expect(promise).rejects.toThrow(`Failed to load script: ${src}`);
  });

  it('when the same script is requested twice, then only one script tag is created', async () => {
    const src = uniqueSrc();
    const first = loadExternalScript(src);
    const second = loadExternalScript(src);

    expect(first).toBe(second);
    expect(findAllTestScripts()).toHaveLength(1);

    getScript(src).onload?.(new Event('load'));
    await first;
  });

  it('when a script fails and is requested again, then a new attempt is made', async () => {
    const src = uniqueSrc();

    const firstAttempt = loadExternalScript(src);
    getScript(src).onerror?.(new Event('error'));
    await expect(firstAttempt).rejects.toThrow();

    const secondAttempt = loadExternalScript(src);
    expect(secondAttempt).not.toBe(firstAttempt);
    expect(findAllTestScripts().filter((s) => s.src === src)).toHaveLength(2);

    findAllTestScripts().at(-1)?.onload?.(new Event('load'));
    await secondAttempt;
  });

  it('when data attributes are provided, then they are set on the script tag', async () => {
    const src = uniqueSrc();
    const promise = loadExternalScript(src, {
      dataAttributes: { productId: 'abc-123', theme: 'dark' },
    });

    const script = getScript(src);
    expect(script.dataset.productId).toBe('abc-123');
    expect(script.dataset.theme).toBe('dark');

    script.onload?.(new Event('load'));
    await promise;
  });
});
