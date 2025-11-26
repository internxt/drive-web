import { describe, expect, it } from 'vitest';
import { wait } from './timeUtils';

describe('timeUtils', () => {
  it('waits the especified ms', async () => {
    const before = new Date().getTime();
    await wait(800);
    const after = new Date().getTime();

    expect(after - before).toBeGreaterThanOrEqual(800);
  });

  it('not waits if the especified ms is wrong', async () => {
    const before = new Date().getTime();
    await wait(-100);
    await wait(NaN);
    const after = new Date().getTime();

    expect(after - before).toBeLessThanOrEqual(100);
  });
});
