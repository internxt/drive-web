import toast from 'react-hot-toast';
import { describe, expect, test, vi } from 'vitest';
import longNotificationsService, { ToastType } from './longNotification.service';

describe('Long notification service', () => {
  describe('Long notification is created', () => {
    test('When the request id is present, then it should be created with it', async () => {
      vi.spyOn(toast, 'custom').mockReturnValue('toast-id-123');

      longNotificationsService.show({
        text: 'test',
        type: ToastType.Error,
        duration: 5000,
        closable: true,
        requestId: 'test-request-id',
      });

      expect(toast.custom).toHaveBeenCalledWith(expect.any(Function), { duration: 5000 });

      // Invoke the render function and check the resulting React element has requestId in props
      const renderFn = (toast.custom as ReturnType<typeof vi.fn>).mock.calls[0][0];
      const element = renderFn({ visible: true });

      expect(element.props).toMatchObject({ requestId: 'test-request-id' });
    });
  });
});
