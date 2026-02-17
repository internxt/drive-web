import { useEffect, useState } from 'react';
import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';
import notificationsService, { ToastType } from 'app/notifications/services/notifications.service';
import { checkoutService } from '../services';
import { CouponCodeData } from '../types';
import { STATUS_CODE_ERROR } from '../constants';
import { errorService } from 'services';

interface UsePromotionalCodeProps {
  priceId: string | null;
  promoCodeName: string | null;
}

export const usePromotionalCode = ({ priceId, promoCodeName }: UsePromotionalCodeProps) => {
  const { translate } = useTranslationContext();
  const [promoCodeData, setPromoCodeData] = useState<CouponCodeData | undefined>();
  const [couponError, setCouponError] = useState<string | null>(null);

  useEffect(() => {
    if (priceId && promoCodeName) {
      fetchPromotionCode({ priceId, promotionCode: promoCodeName });
    }
  }, [promoCodeName]);

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
    const castedError = errorService.castError(err);
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
        requestId: castedError.requestId,
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
