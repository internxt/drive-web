import { useEffect, useState } from 'react';
import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';
import notificationsService, { ToastType } from 'app/notifications/services/notifications.service';
import { checkoutService } from '../services';
import { CouponCodeData } from '../types';
import { STATUS_CODE_ERROR } from '../constants';

interface UsePromotionalCodeProps {
  promoCodeName: string | null;
}

export const usePromotionalCode = ({ promoCodeName }: UsePromotionalCodeProps) => {
  const { translate } = useTranslationContext();
  const [promoCodeData, setPromoCodeData] = useState<CouponCodeData | undefined>();
  const [couponError, setCouponError] = useState<string | null>(null);

  useEffect(() => {
    if (promoCodeName) {
      fetchPromotionCode({ priceId: '', promotionCode: promoCodeName });
    }
  }, [promoCodeName]);

  /*************  ✨ Windsurf Command ⭐  *************/
  /**
   * Fetches the promotional code data for a given priceId and promotional code.
   * @param {{ priceId: string, promotionCode: string }}
   * @returns {Promise<void>}
   */
  /*******  862b8641-88ac-49f9-a9a3-0358b8231505  *******/
  const fetchPromotionCode = async ({
    priceId,
    promotionCode,
  }: {
    priceId: string;
    promotionCode: string;
  }): Promise<void> => {
    const promoCodeData = await checkoutService.fetchPromotionCodeByName(priceId, promotionCode);
    const promoCode = {
      codeId: promoCodeData.codeId,
      codeName: promotionCode,
      amountOff: promoCodeData.amountOff,
      percentOff: promoCodeData.percentOff,
    };

    setPromoCodeData(promoCode);
  };

  const removeCouponCode = () => {
    setPromoCodeData(undefined);
    setCouponError(null);
  };

  const onPromoCodeError = (err: unknown, showNotification?: boolean) => {
    const error = err as Error;
    const statusCode = (err as any).status;
    let errorMessage = translate('notificationMessages.errorApplyingCoupon');
    if (statusCode) {
      if (
        statusCode === STATUS_CODE_ERROR.PROMO_CODE_BY_NAME_NOT_FOUND ||
        statusCode === STATUS_CODE_ERROR.BAD_REQUEST
      ) {
        errorMessage = error.message;
      }
    }
    setCouponError(errorMessage);
    setPromoCodeData(undefined);

    if (showNotification) {
      notificationsService.show({
        text: errorMessage,
        type: ToastType.Error,
      });
    }
  };

  return {
    promoCodeData,
    couponError,
    fetchPromotionCode,
    removeCouponCode,
    onPromoCodeError,
  };
};
