import { Button, Modal } from '@internxt/ui';
import { Copy } from '@phosphor-icons/react';
import { WarningDiamond } from '@phosphor-icons/react/dist/ssr';
import { ActionDialog } from 'app/contexts/dialog-manager/ActionDialogManager.context';
import { useActionDialog } from 'app/contexts/dialog-manager/useActionDialog';
import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';
import notificationsService, { ToastType } from 'app/notifications/services/notifications.service';
import checkoutService from 'app/payment/services/checkout.service';
import { useEffect, useState } from 'react';

export const CRYPTO_PAYMENT_DIALOG_KEY = ActionDialog.CryptoPayment;

interface CryptoPaymentDialogProps {
  paymentRequestUri: string;
  qrUrl: string;
  encodedInvoiceIdToken: string;
  payAmount: number;
  payCurrency: string;
  address: string;
}

export const CryptoPaymentDialog = () => {
  const { translate } = useTranslationContext();
  const { closeDialog, getDialogData, isDialogOpen } = useActionDialog();
  const isCryptoPaymentDialogOpen = isDialogOpen(CRYPTO_PAYMENT_DIALOG_KEY);
  const [timeLeft, setTimeLeft] = useState(1200);

  useEffect(() => {
    if (!isCryptoPaymentDialogOpen || timeLeft <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [isCryptoPaymentDialogOpen, timeLeft]);

  useEffect(() => {
    if (isCryptoPaymentDialogOpen) {
      setTimeLeft(1200);
    }
  }, [isCryptoPaymentDialogOpen]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const onCloseDialog = () => {
    closeDialog(CRYPTO_PAYMENT_DIALOG_KEY);
  };

  const onConfirmPayment = async () => {
    try {
      const isPaymentCompleted = await checkoutService.verifyCryptoPayment(encodedInvoiceIdToken);

      if (isPaymentCompleted) {
        notificationsService.show({
          text: translate('checkout.confirmCryptoPayment.notifications.paymentSucceeded'),
          type: ToastType.Success,
        });
        closeDialog(CRYPTO_PAYMENT_DIALOG_KEY);
      } else {
        notificationsService.show({
          text: translate('checkout.confirmCryptoPayment.notifications.paymentNotCompleted'),
          type: ToastType.Error,
        });
      }
    } catch (error) {
      notificationsService.show({
        text: translate('checkout.confirmCryptoPayment.notifications.unexpectedError'),
        type: ToastType.Error,
      });
    }
  };

  const { qrUrl, address, encodedInvoiceIdToken, payAmount, payCurrency } = getDialogData(
    CRYPTO_PAYMENT_DIALOG_KEY,
  ) as CryptoPaymentDialogProps;

  const onCopyPrice = () => {
    navigator.clipboard.writeText(payAmount.toString());
    notificationsService.show({
      text: 'Price copied to clipboard',
      type: ToastType.Success,
    });
  };

  const onCopyAddress = () => {
    navigator.clipboard.writeText(address);
    notificationsService.show({
      text: 'Address copied to clipboard',
      type: ToastType.Success,
    });
  };

  const isTimeExpired = timeLeft <= 0;

  return (
    <Modal isOpen={isCryptoPaymentDialogOpen} onClose={onCloseDialog}>
      <div className="flex flex-col items-center w-full gap-5 p-2">
        <p className="text-2xl font-bold">{translate('checkout.confirmCryptoPayment.title')}</p>

        {/* Timer */}
        <div className="flex flex-col gap-2">
          <p>{translate('checkout.confirmCryptoPayment.timeExpiration')}</p>
          <div
            className={`flex flex-col items-center p-1 w-full rounded ${
              isTimeExpired ? 'bg-red-50' : timeLeft < 300 ? 'bg-orange-50' : 'bg-gray-10'
            }`}
          >
            <p
              className={`text-2xl font-bold ${
                isTimeExpired ? 'text-red-600' : timeLeft < 300 ? 'text-orange-600' : 'text-gray-800'
              }`}
            >
              {isTimeExpired ? translate('checkout.confirmCryptoPayment.expiredLabel') : formatTime(timeLeft)}
            </p>
          </div>
        </div>

        <img src={qrUrl} alt="Crypto QR Code" className="w-[200px] h-[200px]" />

        <div className="flex flex-col gap-1 items-center w-full">
          <p className="text-lg font-medium">{translate('checkout.confirmCryptoPayment.total')}</p>
          <div className="flex flex-row gap-3 items-center">
            <p>
              {payAmount} {payCurrency}
            </p>
            <button onClick={onCopyPrice}>
              <Copy size={20} />
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-2 items-center w-full">
          <p className="text-xl font-semibold">{translate('checkout.confirmCryptoPayment.copyAddress')}</p>
          <div className="flex flex-row gap-4 items-center w-full">
            <input readOnly value={address} onClick={onCopyAddress} className="w-full flex truncate" />
            <button onClick={onCopyAddress}>
              <Copy size={20} />
            </button>
          </div>
        </div>

        <div className="flex flex-col border-orange bg-orange/20 p-2 rounded-lg w-full items-center">
          <div className="flex flex-row text-orange gap-1">
            <WarningDiamond size={20} />
            <p>{translate('checkout.confirmCryptoPayment.doNotCloseWindowWarning')}</p>
          </div>
        </div>

        <div className="flex flex-row gap-2">
          <Button variant="secondary" onClick={onCloseDialog}>
            {translate('checkout.confirmCryptoPayment.cancel')}
          </Button>
          <Button disabled={isTimeExpired} onClick={onConfirmPayment}>
            {isTimeExpired
              ? translate('checkout.confirmCryptoPayment.sessionExpired')
              : translate('checkout.confirmCryptoPayment.confirm')}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
