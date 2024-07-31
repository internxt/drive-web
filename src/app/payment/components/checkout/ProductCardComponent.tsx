import { Menu, Switch, Transition } from '@headlessui/react';
import { Check, SealPercent } from '@phosphor-icons/react';
import { bytesToString } from 'app/drive/services/size.service';
import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';
import Button from 'app/shared/components/Button/Button';
import { ReactComponent as GuaranteeDarkDays } from 'assets/icons/checkout/guarantee-dark.svg';
import { ReactComponent as GuaranteeWhiteDays } from 'assets/icons/checkout/guarantee-white.svg';
import { DisplayPrice } from '@internxt/sdk/dist/drive/payments/types';
import { CouponCodeData, Currency, CurrentPlanSelected, UpsellManagerProps } from '../../types';
import { useState } from 'react';
import { useHotkeys } from 'react-hotkeys-hook';
import { useThemeContext } from 'app/theme/ThemeProvider';

interface ProductFeaturesComponentProps {
  selectedPlan: CurrentPlanSelected;
  couponCodeData?: CouponCodeData;
  couponError?: string;
  onCouponInputChange: (promoCode: string) => void;
  upsellManager: UpsellManagerProps;
}

const Separator = () => <div className="border border-gray-10" />;

const getProductAmount = (amount: DisplayPrice['amount'], couponCodeData?: CouponCodeData): number => {
  if (couponCodeData?.amountOff) {
    return amount - couponCodeData.amountOff;
  }

  if (couponCodeData?.percentOff) {
    const discount = 100 - couponCodeData.percentOff;

    return (amount * discount) / 100;
  }

  return amount;
};

export const ProductFeaturesComponent = ({
  selectedPlan,
  couponCodeData,
  couponError,
  onCouponInputChange,
  upsellManager,
}: ProductFeaturesComponentProps) => {
  const { translate, translateList } = useTranslationContext();
  const { checkoutTheme } = useThemeContext();

  const [couponName, setCouponName] = useState<string>('');
  const { isUpsellSwitchActivated, showUpsellSwitch, onUpsellSwitchButtonClicked } = upsellManager;

  const bytes = bytesToString(selectedPlan.bytes);
  const features = translateList('checkout.productCard.planDetails.features', {
    spaceToUpgrade: bytes,
  });

  const normalPriceAmount = selectedPlan.decimalAmount;

  const planAmount = getProductAmount(selectedPlan.decimalAmount, couponCodeData).toFixed(2);
  const upsellPlanAmount = upsellManager.amount && getProductAmount(upsellManager.amount, couponCodeData).toFixed(2);

  useHotkeys(
    'enter',
    (event) => {
      event.preventDefault();
      onCouponInputChange(couponName.toUpperCase());
    },
    [couponName],
  );

  return (
    <div className="w-full flex-col space-y-4">
      <div className="flex w-full flex-row items-center justify-between space-x-4">
        <p className="text-2xl font-semibold text-gray-100">{translate('checkout.productCard.title')}</p>
        <div className="flex flex-row space-x-2">
          {checkoutTheme === 'dark' ? <GuaranteeWhiteDays className="h-12" /> : <GuaranteeDarkDays className="h-12" />}
        </div>
      </div>
      <div className="flex w-full rounded-2xl border-gray-10 bg-surface p-5">
        <div className="flex w-full flex-col space-y-5">
          <p>{translate('checkout.productCard.selectedPlan')}</p>
          <p className="text-2xl font-bold text-gray-100">
            {translate(`checkout.productCard.plan.${selectedPlan.interval}`, {
              spaceToUpgrade: bytes,
              interval: selectedPlan.interval,
            })}
          </p>
          <div className="flex flex-row items-center justify-between text-gray-100">
            <p className="font-medium">{translate(`checkout.productCard.billed.${selectedPlan.interval}`)}</p>
            {/* TODO: Change currency if needed */}
            <p className="font-semibold">{planAmount}€</p>
          </div>
          {couponCodeData && (
            <div className="flex flex-row items-center justify-between font-semibold">
              <div className="flex flex-row items-center space-x-2 text-green-dark">
                <SealPercent weight="fill" size={24} />
                <p className="">
                  {translate('checkout.productCard.saving', {
                    percent: couponCodeData?.percentOff,
                  })}
                </p>
              </div>
              <p className="text-gray-50 line-through">{normalPriceAmount}€</p>
            </div>
          )}
          <Separator />
          <div className="flex flex-col space-y-5">
            <p className="font-medium text-gray-100">{translate('checkout.productCard.planDetails.title')}</p>
            <div className="flex flex-col space-y-4">
              {features.map((feature) => (
                <div key={feature} className="flex flex-row items-center space-x-3">
                  <Check className="text-green-dark" size={16} weight="bold" />
                  <p className="text-gray-100">{feature}</p>
                </div>
              ))}
            </div>
          </div>
          <Separator />
          <div className="flex flex-row items-center justify-between text-2xl font-semibold text-gray-100">
            <p>{translate('checkout.productCard.total')}</p>
            <p>{planAmount}€</p>
          </div>
          <Separator />
          {showUpsellSwitch && upsellManager.amountSaved ? (
            <>
              <div className="flex w-full flex-row items-center justify-between">
                <div className="flex flex-row items-center gap-4">
                  <Switch
                    checked={isUpsellSwitchActivated}
                    onChange={() => {
                      onUpsellSwitchButtonClicked();
                    }}
                    className={`${
                      isUpsellSwitchActivated ? 'bg-green' : 'bg-gray-10'
                    } relative inline-flex h-6 w-11 items-center rounded-full`}
                  >
                    <span
                      id="switchButton"
                      className={`${
                        isUpsellSwitchActivated ? 'translate-x-6' : 'translate-x-1'
                      } inline-block h-4 w-4 transform rounded-full bg-white transition`}
                    />
                  </Switch>

                  <div className="flex h-full rounded-lg bg-green/10 px-3 py-1">
                    <p className="text-sm text-green">
                      {translate('checkout.productCard.amountSaved')}
                      {upsellManager.amountSaved} {Currency[selectedPlan.currency]}
                    </p>
                  </div>
                  <p className="font-medium text-gray-80">{translate('checkout.productCard.withAnnualBilling')}</p>
                </div>
                <div className="flex flex-row items-center">
                  <p className="text-sm text-gray-80">
                    {Currency[selectedPlan.currency]}
                    {upsellPlanAmount}/{translate('views.account.tabs.account.view.subscription.yearly')}
                  </p>
                </div>
              </div>
              <Separator />
            </>
          ) : undefined}
          {couponCodeData?.codeName ? (
            <div className="flex w-full flex-row justify-between">
              <p className={'font-medium text-gray-50'}>{translate('checkout.productCard.addCoupon.inputText')}</p>
              <p className="text-lg font-medium text-gray-50">{couponCodeData.codeName}</p>
            </div>
          ) : (
            <Menu>
              <Menu.Button
                className={
                  'flex h-full w-full rounded-lg text-base transition-all duration-75 ease-in-out hover:underline'
                }
              >
                {translate('checkout.productCard.addCoupon.buttonTitle')}
              </Menu.Button>
              <Transition
                className={'left-0'}
                enter="transition duration-50 ease-out"
                enterFrom="scale-98 opacity-0"
                enterTo="scale-100 opacity-100"
                leave="transition duration-50 ease-out"
                leaveFrom="scale-98 opacity-100"
                leaveTo="scale-100 opacity-0"
              >
                <Menu.Items className="w-full items-center outline-none">
                  <div className="flex w-full flex-col items-start space-y-1">
                    <p className="text-sm text-gray-80">{translate('checkout.productCard.addCoupon.inputText')}</p>
                    <div className="flex w-full flex-row space-x-3">
                      <input
                        value={couponName}
                        onChange={(e) => {
                          e.preventDefault();
                          setCouponName(e.target.value);
                        }}
                        placeholder={translate('checkout.productCard.addCoupon.inputText')}
                        min={0}
                        style={{
                          textTransform: 'uppercase',
                        }}
                        required={true}
                        data-cy={'coupon-code-input'}
                        className={'inxt-input input-primary'}
                      />
                      <Button
                        disabled={!couponName?.length}
                        onClick={() => {
                          onCouponInputChange(couponName.toUpperCase());
                        }}
                      >
                        {translate('checkout.productCard.addCoupon.applyCodeButtonTitle')}
                      </Button>
                    </div>
                    {couponError ? <p className="text-red-dark">{couponError}</p> : undefined}
                  </div>
                </Menu.Items>
              </Transition>
            </Menu>
          )}
        </div>
      </div>
    </div>
  );
};
