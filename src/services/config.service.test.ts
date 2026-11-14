import { describe, expect, test } from 'vitest';
import configService from './config.service';

describe('Route access', () => {
  test.each(['/login', '/new'])(
    'when the user is on %s, then the page is public so it stays visible while the session finishes loading',
    (path) => {
      const routeConfig = configService.getViewConfig({ path });

      expect(routeConfig?.auth).toBe(false);
    },
  );
});
