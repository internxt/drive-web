import { useState } from 'react';
import { Menu, Switch, Transition } from '@headlessui/react';
import { UserType } from '@internxt/sdk/dist/drive/payments/types';
import { Check, SealPercent, X } from '@phosphor-icons/react';

import { bytesToString } from '../../../drive/services/size.service';
import { useTranslationContext } from '../../../i18n/provider/TranslationProvider';
import { UpsellManagerProps } from '../../../payment/views/IntegratedCheckoutView/CheckoutViewWrapper';
import TextInput from '../../../share/components/ShareItemDialog/components/TextInput';
import Button from '../../../shared/components/Button/Button';
import { useThemeContext } from '../../../theme/ThemeProvider';
import { ReactComponent as GuaranteeDarkDays } from 'assets/icons/checkout/guarantee-dark.svg';
import { ReactComponent as GuaranteeWhiteDays } from 'assets/icons/checkout/guarantee-white.svg';
import { CouponCodeData, Currency, RequestedPlanData } from '../../types';
import { SelectSeatsComponent } from './SelectSeatsComponent';
import { getProductAmount } from 'app/payment/utils/getProductAmount';

interface ProductFeaturesComponentProps {
  selectedPlan: RequestedPlanData;
  seatsForBusinessSubscription: number;
  upsellManager: UpsellManagerProps;
  onUsersChange: (users: number) => void;
  onRemoveAppliedCouponCode: () => void;
  onCouponInputChange: (promoCode: string) => void;
  couponCodeData?: CouponCodeData;
  couponError?: string;
}

const STANDARD_BUSINESS_PLAN_SPACE = '1TB';
const FILE_SIZE_LIMIT_STANDARD_BUSINESS_PLAN = '5TB';
const FILE_SIZE_LIMIT_PRO_BUSINESS_PLAN = '20TB';

const Separator = () => <div className="border border-gray-10" />;

const getTextContent = (
  users: number,
  isBusiness: boolean,
  bytes: string,
  selectedPlan: RequestedPlanData,
  translate: (key: string, props?: Record<string, unknown>) => string,
  translateList: (key: string, props?: Record<string, unknown>) => string[],
) => {
  const maxUploadGBfileSize =
    bytes === STANDARD_BUSINESS_PLAN_SPACE ? FILE_SIZE_LIMIT_STANDARD_BUSINESS_PLAN : FILE_SIZE_LIMIT_PRO_BUSINESS_PLAN;

  const perUserLabel = isBusiness ? translate('checkout.productCard.perUser') : undefined;
  const totalLabel = isBusiness
    ? translate('checkout.productCard.totalForBusiness', {
        N: users,
      })
    : translate('checkout.productCard.total');
  const features = translateList(
    `checkout.productCard.planDetails.features.${selectedPlan.type ?? UserType.Individual}`,
    {
      spaceToUpgrade: bytes,
      minimumSeats: selectedPlan.minimumSeats,
      maximumSeats: selectedPlan.maximumSeats,
      maxUploadGBfile: maxUploadGBfileSize,
    },
  );

  return {
    perUserLabel,
    totalLabel,
    features,
  };
};

export const ProductFeaturesComponent = ({
  selectedPlan,
  couponCodeData,
  couponError,
  seatsForBusinessSubscription,
  upsellManager,
  onUsersChange,
  onRemoveAppliedCouponCode,
  onCouponInputChange,
}: ProductFeaturesComponentProps) => {
  const { translate, translateList } = useTranslationContext();
  const { checkoutTheme } = useThemeContext();
  const [couponName, setCouponName] = useState<string>('');
  const bytes = bytesToString(selectedPlan.bytes);

  const { isUpsellSwitchActivated, showUpsellSwitch, onUpsellSwitchButtonClicked } = upsellManager;
  const isBusiness = selectedPlan.type === UserType.Business;
  const textContent = getTextContent(
    seatsForBusinessSubscription,
    isBusiness,
    bytes,
    selectedPlan,
    translate,
    translateList,
  );

  const normalPriceAmount = selectedPlan.decimalAmount;
  const planAmount = getProductAmount(selectedPlan.decimalAmount, 1, couponCodeData).toFixed(2);
  const totalAmount = getProductAmount(
    selectedPlan.decimalAmount,
    seatsForBusinessSubscription,
    couponCodeData,
  ).toFixed(2);
  const upsellPlanAmount =
    upsellManager.amount &&
    getProductAmount(upsellManager.amount, seatsForBusinessSubscription, couponCodeData).toFixed(2);

  const discountPercentage =
    couponCodeData?.amountOff && couponCodeData?.amountOff < selectedPlan.amount
      ? ((couponCodeData?.amountOff / selectedPlan.amount) * 100).toFixed(2)
      : undefined;

  return (
    <div className="flex w-full flex-col space-y-4 overflow-y-auto">
      <div className="flex w-full flex-row items-center justify-between space-x-4">
        <p className="text-2xl font-semibold text-gray-100">{translate('checkout.productCard.title')}</p>
        <div className="flex flex-row space-x-2">
          {checkoutTheme === 'dark' ? <GuaranteeWhiteDays className="h-12" /> : <GuaranteeDarkDays className="h-12" />}
        </div>
      </div>
      <div className="flex w-full rounded-2xl border border-gray-10 bg-surface p-5">
        <div className="flex w-full flex-col space-y-5">
          <p>{translate('checkout.productCard.selectedPlan')}</p>
          <p className="text-2xl font-bold text-gray-100">
            {translate(`checkout.productCard.plan.${selectedPlan.interval}`, {
              spaceToUpgrade: bytes,
              interval: translate(`checkout.productCard.renewalPeriod.${selectedPlan.interval}`),
            })}
          </p>
          {isBusiness ? (
            <SelectSeatsComponent
              disableMinusButton={
                !!selectedPlan.minimumSeats && seatsForBusinessSubscription <= selectedPlan?.minimumSeats
              }
              disablePlusButton={
                !!selectedPlan.maximumSeats && seatsForBusinessSubscription >= selectedPlan?.maximumSeats
              }
              seats={seatsForBusinessSubscription}
              onUsersChange={onUsersChange}
            />
          ) : undefined}
          <div className="flex flex-row items-center justify-between text-gray-100">
            <p className="font-medium">
              {translate(`checkout.productCard.billed.${selectedPlan.interval}`)}
              {textContent.perUserLabel}
            </p>
            <p className="font-semibold">
              {Currency[selectedPlan.currency]}
              {planAmount}
            </p>
          </div>
          {couponCodeData && (
            <div className="flex flex-row items-center justify-between font-semibold">
              <div className="flex flex-row items-center space-x-2 text-green-dark">
                <SealPercent weight="fill" size={24} />
                <p className="">
                  {translate('checkout.productCard.saving', {
                    percent: couponCodeData?.percentOff ?? discountPercentage,
                  })}
                </p>
              </div>
              <p className="text-gray-50 line-through">
                {Currency[selectedPlan.currency]}
                {normalPriceAmount}
              </p>
            </div>
          )}
          <Separator />
          <div className="flex flex-col space-y-5">
            <p className="font-medium text-gray-100">{translate('checkout.productCard.planDetails.title')}</p>
            <div className="flex flex-col space-y-4">
              {textContent.features.map((feature) => (
                <div key={feature} className="flex flex-row items-center space-x-2">
                  <Check className="text-green-dark" size={16} weight="bold" />
                  <p className="text-gray-100">{feature}</p>
                </div>
              ))}
            </div>
          </div>
          <Separator />
          <div className="flex flex-row items-center justify-between text-2xl font-semibold text-gray-100">
            <p>{textContent.totalLabel}</p>
            <p>
              {Currency[selectedPlan.currency]}
              {totalAmount}
            </p>
          </div>
          <Separator />
          {showUpsellSwitch && upsellManager.amountSaved && (
            <>
              <div className="flex w-full flex-row items-center justify-between">
                <div className="flex flex-row items-center gap-4">
                  <Switch
                    checked={isUpsellSwitchActivated}
                    onChange={onUpsellSwitchButtonClicked}
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
                      {Currency[selectedPlan.currency]}
                      {upsellManager.amountSaved}
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
          )}
          {couponCodeData?.codeName ? (
            <div className="flex w-full flex-row justify-between">
              <p className={'font-medium text-gray-50'}>{translate('checkout.productCard.addCoupon.inputText')}</p>
              <div className="flex flex-row items-center gap-2">
                <p className="text-lg font-medium text-gray-50">{couponCodeData.codeName}</p>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    onRemoveAppliedCouponCode();
                  }}
                >
                  <X size={20} className="text-gray-50" />
                </button>
              </div>
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
                      <TextInput
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
                        data-cy={'coupon-code-input'}
                        className={'inxt-input input-primary dark:bg-transparent'}
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
                    {couponError && <p className="text-red-dark">{couponError}</p>}
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
