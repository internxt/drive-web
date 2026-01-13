import { envService, localStorageService } from 'services';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { checkoutService } from '../services';
import { PcCloudError, processPcCloudPayment, ProcessPcCloudPaymentProps } from './pcCloud.utils';

const mockedProps: ProcessPcCloudPaymentProps = {
  customerId: 'customer_id',
  elements: vi.fn() as any,
  mobileToken: 'mobile_token',
  stripeSDK: {
    confirmSetup: vi.fn().mockImplementation(() => Promise.resolve({ error: undefined })),
  } as any,
  selectedPlan: {
    price: {
      id: 'price_id',
    },
  },
  token: 'token',
};
const mockHostnameEnv = 'https://api.test.com';

describe('PC Cloud utils', () => {
  beforeEach(() => {
    vi.spyOn(envService, 'getVariable').mockImplementation((env: any) => {
      if (env === 'hostname') {
        return mockHostnameEnv;
      }
      return '';
    });
  });

  describe('Processing a PC cloud payment', () => {
    test('When the user wants to purchase a plan from pc cloud, then the setup should be done correctly', async () => {
      const mockedClientSecret = 'client_secret';
      const setLocalStorageServiceSpy = vi.spyOn(localStorageService, 'set').mockReturnValue();
      vi.spyOn(checkoutService, 'checkoutSetupIntent').mockResolvedValue({
        clientSecret: mockedClientSecret,
      });

      await processPcCloudPayment(mockedProps);

      expect(setLocalStorageServiceSpy).toHaveBeenCalledWith('customerId', mockedProps.customerId);
      expect(setLocalStorageServiceSpy).toHaveBeenCalledWith('token', mockedProps.token);
      expect(setLocalStorageServiceSpy).toHaveBeenCalledWith('priceId', mockedProps.selectedPlan.price.id);
      expect(setLocalStorageServiceSpy).toHaveBeenCalledWith('customerToken', mockedProps.token);
      expect(setLocalStorageServiceSpy).toHaveBeenCalledWith('mobileToken', mockedProps.mobileToken);
      expect(mockedProps.stripeSDK.confirmSetup).toHaveBeenCalled();
      expect(mockedProps.stripeSDK.confirmSetup).toHaveBeenCalledWith({
        clientSecret: mockedClientSecret,
        elements: mockedProps.elements,
        confirmParams: {
          return_url: `${mockHostnameEnv}/checkout/pcCloud-success?mobileToken=${mockedProps.mobileToken}&priceId=${mockedProps.selectedPlan.price.id}`,
        },
      });
    });

    test('When the user wants to purchase a plan from pc cloud and an error occurs, then an error indicating so is thrown', async () => {
      const mockedClientSecret = 'client_secret';
      const mockedErrorMessage = 'Error while processing the payment';
      const mockedPropsWithError = {
        ...mockedProps,
        stripeSDK: {
          confirmSetup: vi.fn().mockImplementation(() =>
            Promise.resolve({
              error: {
                message: mockedErrorMessage,
              },
            }),
          ),
        } as any,
      };
      vi.spyOn(localStorageService, 'set').mockReturnValue();
      vi.spyOn(checkoutService, 'checkoutSetupIntent').mockResolvedValue({
        clientSecret: mockedClientSecret,
      });

      await expect(processPcCloudPayment(mockedPropsWithError)).rejects.toThrow(PcCloudError);
    });
  });
});
