import { useState } from 'react';
import { Menu, Switch, Transition } from '@headlessui/react';
import { DisplayPrice, UserType } from '@internxt/sdk/dist/drive/payments/types';
import { Check, SealPercent, X } from '@phosphor-icons/react';

import { bytesToString } from '../../../drive/services/size.service';
import { useTranslationContext } from '../../../i18n/provider/TranslationProvider';
import { UpsellManagerProps } from '../../../payment/views/IntegratedCheckoutView/CheckoutViewWrapper';
import TextInput from '../../../share/components/ShareItemDialog/components/TextInput';
import Button from '../../../shared/components/Button/Button';
import { useThemeContext } from '../../../theme/ThemeProvider';
import { ReactComponent as GuaranteeDarkDays } from 'assets/icons/checkout/guarantee-dark.svg';
import { ReactComponent as GuaranteeWhiteDays } from 'assets/icons/checkout/guarantee-white.svg';
import { CouponCodeData, Currency, CurrentPlanSelected } from '../../types';

interface ProductFeaturesComponentProps {
  selectedPlan: CurrentPlanSelected;
  users: number;
  upsellManager: UpsellManagerProps;
  setUsers: (users: number) => void;
  onRemoveAppliedCouponCode: () => void;
  onCouponInputChange: (promoCode: string) => void;
  couponCodeData?: CouponCodeData;
  couponError?: string;
}

const Separator = () => <div className="border border-gray-10" />;
const SeparatorVertical = () => <div className="h-max border-[0.5px] border-gray-10 py-1" />;

export const getProductAmount = (
  amount: DisplayPrice['amount'],
  users: number,
  couponCodeData?: CouponCodeData,
): number => {
  if (couponCodeData?.amountOff) {
    return (amount - couponCodeData.amountOff / 100) * users;
  }

  if (couponCodeData?.percentOff) {
    const discount = 100 - couponCodeData.percentOff;

    return ((amount * discount) / 100) * users;
  }

  return amount * users;
};

export const ProductFeaturesComponent = ({
  selectedPlan,
  couponCodeData,
  couponError,
  users,
  upsellManager,
  setUsers,
  onRemoveAppliedCouponCode,
  onCouponInputChange,
}: ProductFeaturesComponentProps) => {
  const { translate, translateList } = useTranslationContext();
  const { checkoutTheme } = useThemeContext();
  const [couponName, setCouponName] = useState<string>('');
  const [totalUsers, setTotalUsers] = useState<number>(3);
  const bytes = bytesToString(selectedPlan.bytes);

  const { isUpsellSwitchActivated, showUpsellSwitch, onUpsellSwitchButtonClicked } = upsellManager;
  const isBusiness = selectedPlan.type === UserType.Business;
  const perUserLabel = isBusiness ? translate('checkout.productCard.perUser') : undefined;
  const totalLabel = isBusiness
    ? translate('checkout.productCard.totalForBusiness', {
        N: users,
      })
    : translate('checkout.productCard.total');
  const maxUploadGBfile = bytes === '1TB' ? '5GB' : '20GB';
  const features = translateList(`checkout.productCard.planDetails.features.${selectedPlan.type}`, {
    spaceToUpgrade: bytes,
    minimumSeats: selectedPlan.minimumSeats,
    maximumSeats: selectedPlan.maximumSeats,
    maxUploadGBfile,
  });
  const normalPriceAmount = selectedPlan.decimalAmount;
  const planAmount = getProductAmount(selectedPlan.decimalAmount, 1, couponCodeData).toFixed(2);
  const totalAmount = getProductAmount(selectedPlan.decimalAmount, users, couponCodeData).toFixed(2);
  const upsellPlanAmount =
    upsellManager.amount && getProductAmount(upsellManager.amount, users, couponCodeData).toFixed(2);

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
          <div className="flex flex-row items-center justify-between text-gray-100">
            <p className="font-medium">
              {translate(`checkout.productCard.billed.${selectedPlan.interval}`)}
              {perUserLabel}
            </p>
            <p className="font-semibold">
              {Currency[selectedPlan.currency]}
              {planAmount}
            </p>
          </div>
          {selectedPlan.type === UserType.Business ? (
            <div
              onKeyDown={(e) => {
                e.stopPropagation();
              }}
              className="flex w-max flex-row items-center rounded-lg border"
            >
              <button
                disabled={users === selectedPlan.minimumSeats}
                onClick={(e) => {
                  e.preventDefault();
                  setUsers(users - 1);
                  setTotalUsers(totalUsers - 1);
                }}
                className="flex h-full flex-col items-center justify-center rounded-l-lg px-4 hover:bg-gray-10"
              >
                -
              </button>
              <SeparatorVertical />
              <input
                type="number"
                className="flex w-10 items-center justify-center !rounded-none border-0 text-center !outline-none !ring-0"
                value={totalUsers}
                min={3}
                max={10}
                onChange={(e) => {
                  e.preventDefault();
                  setTotalUsers(Number(e.target.value));
                }}
                onKeyDown={(e) => {
                  e.stopPropagation();
                }}
                onBlur={(e) => {
                  e.preventDefault();
                  const users = Number(totalUsers);
                  if (users < 3) {
                    setUsers(3);
                    setTotalUsers(3);
                  } else if (users > 10) {
                    setUsers(10);
                    setTotalUsers(10);
                  } else {
                    setUsers(users);
                  }
                }}
              />
              <SeparatorVertical />
              <button
                disabled={users === selectedPlan.maximumSeats}
                onClick={(e) => {
                  e.preventDefault();
                  setUsers(users + 1);
                  setTotalUsers(totalUsers + 1);
                }}
                className="flex h-full flex-col items-center justify-center rounded-r-lg px-4 hover:bg-gray-10"
              >
                +
              </button>
            </div>
          ) : undefined}
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
              {features.map((feature) => (
                <div key={feature} className="flex flex-row items-center space-x-2">
                  <Check className="text-green-dark" size={16} weight="bold" />
                  <p className="text-gray-100">{feature}</p>
                </div>
              ))}
            </div>
          </div>
          <Separator />
          <div className="flex flex-row items-center justify-between text-2xl font-semibold text-gray-100">
            <p>{totalLabel}</p>
            <p>
              {Currency[selectedPlan.currency]}
              {totalAmount}
            </p>
          </div>
          <Separator />
          {showUpsellSwitch && upsellManager.amountSaved ? (
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
          ) : undefined}
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
