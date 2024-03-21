import { useState } from 'react';
import { t } from 'i18next';
import { PaymentMethod } from '@internxt/sdk/dist/drive/payments/types';
import Spinner from 'app/shared/components/Spinner/Spinner';
import Button from 'app/shared/components/Button/Button';
import Card from 'app/shared/components/Card';

import visaIcon from '../../../assets/icons/card-brands/visa.png';
import amexIcon from '../../../assets/icons/card-brands/amex.png';
import dinersIcon from '../../../assets/icons/card-brands/diners_club.png';
import discoverIcon from '../../../assets/icons/card-brands/discover.png';
import jcbIcon from '../../../assets/icons/card-brands/jcb.png';
import mastercardIcon from '../../../assets/icons/card-brands/mastercard.png';
import unionpayIcon from '../../../assets/icons/card-brands/unionpay.png';
import unknownIcon from '../../../assets/icons/card-brands/unknown.png';
import EditPaymentMethodModal from './EditPaymentMethodModal';
import { useDefaultPaymentMethod } from '../hooks/useDefaultPaymentMethod';

const BillingPaymentMethodCard = () => {
  const [isEditPaymentMethodModalOpen, setIsEditPaymentMethodModalOpen] = useState<boolean>(false);
  const defaultPaymentMethod = useDefaultPaymentMethod();

  const cardBrands: Record<PaymentMethod['card']['brand'], string> = {
    visa: visaIcon,
    amex: amexIcon,
    diners: dinersIcon,
    discover: discoverIcon,
    jcb: jcbIcon,
    mastercard: mastercardIcon,
    unionpay: unionpayIcon,
    unknown: unknownIcon,
  };

  const paymentsTypes = {
    paypal: 'PayPal',
    sepa_debit: 'SEPA Direct Debit',
  };

  const onEditPaymentMethodButtonClicked = () => {
    setIsEditPaymentMethodModalOpen(true);
  };

  return (
    <section className="space-y-3">
      <div className="flex w-full flex-row items-center justify-between ">
        <span className="text-xl font-medium">{t('preferences.workspace.billing.paymentMethod.title')}</span>
        <Button variant="secondary" onClick={onEditPaymentMethodButtonClicked}>
          <span>{t('preferences.workspace.billing.paymentMethod.editButton')}</span>
        </Button>
      </div>
      <Card>
        {(defaultPaymentMethod.tag === 'ready' && defaultPaymentMethod.card) ||
        (defaultPaymentMethod.tag === 'ready' && defaultPaymentMethod.type) ? (
          <div className="flex">
            {defaultPaymentMethod.card ? (
              <>
                <img className="h-9 rounded-md" src={cardBrands[defaultPaymentMethod.card.brand]} />
                <div className="ml-4 flex-1">
                  <div className="flex items-center text-gray-80">
                    <p style={{ lineHeight: 1 }} className="font-serif text-2xl">
                      {'····'}
                    </p>
                    <p className="ml-1.5 text-sm">{defaultPaymentMethod.card.last4}</p>
                  </div>
                  <p className="text-xs text-gray-50">{`${defaultPaymentMethod.card.exp_month}/${defaultPaymentMethod.card.exp_year}`}</p>
                </div>
              </>
            ) : (
              defaultPaymentMethod.type && (
                <>
                  <div className="ml-4 flex-1">
                    <div className="flex items-center text-gray-100">
                      <p className="text-base font-medium leading-tight">{paymentsTypes[defaultPaymentMethod.type]}</p>
                    </div>
                    <p className="text-sm text-gray-50">
                      {t('views.account.tabs.billing.paymentMethod.contactUs.description')}
                    </p>
                  </div>
                </>
              )
            )}
          </div>
        ) : defaultPaymentMethod.tag === 'loading' ? (
          <div className="flex h-10 items-center justify-center">
            <Spinner className="h-5 w-5" />
          </div>
        ) : (
          <div className="text-center">
            <h1 className="font-medium text-gray-60">{t('views.account.tabs.billing.paymentMethod.empty.title')}</h1>
            <p className="text-sm text-gray-50">{t('views.account.tabs.billing.paymentMethod.empty.subtitle')}</p>
          </div>
        )}
      </Card>
      <EditPaymentMethodModal
        isEditPaymentMethodModalOpen={isEditPaymentMethodModalOpen}
        setIsEditPaymentMethodModalOpen={setIsEditPaymentMethodModalOpen}
      />
    </section>
  );
};

export default BillingPaymentMethodCard;
