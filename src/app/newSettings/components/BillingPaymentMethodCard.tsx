import { PaymentMethod, UserType } from '@internxt/sdk/dist/drive/payments/types';
import { Button, Loader } from '@internxt/ui';
import Card from 'app/shared/components/Card';
import { t } from 'i18next';
import { useEffect, useState } from 'react';

import amexIcon from '../../../assets/icons/card-brands/amex.png';
import dinersIcon from '../../../assets/icons/card-brands/diners_club.png';
import discoverIcon from '../../../assets/icons/card-brands/discover.png';
import jcbIcon from '../../../assets/icons/card-brands/jcb.png';
import mastercardIcon from '../../../assets/icons/card-brands/mastercard.png';
import unionpayIcon from '../../../assets/icons/card-brands/unionpay.png';
import unknownIcon from '../../../assets/icons/card-brands/unknown.png';
import visaIcon from '../../../assets/icons/card-brands/visa.png';
import EditPaymentMethodModal from '../Sections/Workspace/Billing/components/EditPaymentMethodModal';
import { useDefaultPaymentMethod } from '../hooks/useDefaultPaymentMethod';
import { UserSettings } from '@internxt/sdk/dist/shared/types/userSettings';
import { RootState } from 'app/store';
import { useSelector } from 'react-redux';

const BillingPaymentMethodCard = ({
  subscription,
  userType,
}: {
  subscription: 'free' | 'lifetime' | 'subscription' | undefined;
  userType: UserType;
}) => {
  const user = useSelector((state: RootState) => state.user.user) as UserSettings;
  const userFullName = user.name && user.lastname ? `${user.name} ${user.lastname}` : user.name || user.lastname;
  const [isEditPaymentMethodModalOpen, setIsEditPaymentMethodModalOpen] = useState<boolean>(false);
  const [existsPaymentMethod, setExistsPaymentMethod] = useState<boolean>(false);
  const defaultPaymentMethod = useDefaultPaymentMethod(userFullName, userType);

  useEffect(() => {
    (defaultPaymentMethod.tag === 'ready' && defaultPaymentMethod.card) ||
    (defaultPaymentMethod.tag === 'ready' && defaultPaymentMethod.type)
      ? setExistsPaymentMethod(true)
      : setExistsPaymentMethod(false);
  }, [defaultPaymentMethod]);

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
        {subscription && subscription !== 'free' && (
          <Button variant="secondary" onClick={onEditPaymentMethodButtonClicked}>
            {existsPaymentMethod ? (
              <span>{t('preferences.workspace.billing.paymentMethod.editButton')}</span>
            ) : (
              <span>{t('preferences.workspace.billing.paymentMethod.addButton')}</span>
            )}
          </Button>
        )}
      </div>
      <Card className={`${defaultPaymentMethod.tag === 'empty' && 'h-20'}`}>
        {existsPaymentMethod ? (
          <div className="flex">
            {defaultPaymentMethod.card ? (
              <>
                <img
                  className="h-11 rounded-md"
                  src={cardBrands[defaultPaymentMethod.card.brand]}
                  alt={cardBrands[defaultPaymentMethod.card.brand]}
                />
                <div className="ml-4 flex-1">
                  <div className="flex flex-col">
                    <p className="text-base font-medium text-gray-100">{defaultPaymentMethod.name}</p>
                    <div className="font-regular flex flex-row text-base text-gray-60">
                      <p>&#x25CF;&#x25CF;&#x25CF;&#x25CF;</p>
                      <p className="ml-1.5 mr-2.5">{defaultPaymentMethod.card.last4}</p>
                      <p>{`${defaultPaymentMethod.card.exp_month}/${defaultPaymentMethod.card.exp_year}`}</p>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              defaultPaymentMethod.type && (
                <div className="ml-4 flex-1">
                  <div className="flex items-center text-gray-100">
                    <p className="text-base font-medium leading-tight">{paymentsTypes[defaultPaymentMethod.type]}</p>
                  </div>
                  <p className="text-sm text-gray-50">
                    {t('views.account.tabs.billing.paymentMethod.contactUs.description')}
                  </p>
                </div>
              )
            )}
          </div>
        ) : defaultPaymentMethod.tag === 'loading' ? (
          <div className="flex h-10 items-center justify-center">
            <Loader classNameLoader="h-5 w-5" />
          </div>
        ) : (
          <div className="flex h-full items-center justify-center text-center">
            <p className="font-regular text-base text-gray-60">
              {t('preferences.workspace.billing.paymentMethod.empty')}
            </p>
          </div>
        )}
      </Card>
      <EditPaymentMethodModal
        isEditPaymentMethodModalOpen={isEditPaymentMethodModalOpen}
        setIsEditPaymentMethodModalOpen={setIsEditPaymentMethodModalOpen}
        userType={userType}
      />
    </section>
  );
};

export default BillingPaymentMethodCard;
