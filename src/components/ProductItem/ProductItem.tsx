import { useEffect } from 'react';
import { Fragment, useState } from 'react';

import BaseButton from '../Buttons/BaseButton';
import { RenewalPeriod } from '../../models/enums';
import { ProductData } from '../../models/interfaces';
import i18n from '../../services/i18n.service';
import moneyService from '../../services/money.service';
import screenService from '../../services/screen.service';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { paymentThunks } from '../../store/slices/payment';

import './ProductItem.scss';
import NumberInput from '../forms/inputs/NumberInput';
import numberService from '../../services/number.service';

interface ProductItemProps {
  product: ProductData;
  currentPlanId: string | undefined;
  isBuyButtonDisabled: boolean;
  isBusiness: boolean;
}

const ProductItem = ({ product, isBuyButtonDisabled }: ProductItemProps): JSX.Element => {
  const dispatch = useAppDispatch();
  const [isLgScreen, setIsLgScreen] = useState(screenService.isLg());
  const [teamMembersCount, setTeamMembersCount] = useState(2);
  const currentPriceId = useAppSelector((state) => state.payment.currentPriceId);
  const isCurrentProduct = currentPriceId === product.price.id;
  const isLifetime = product.renewalPeriod === RenewalPeriod.Lifetime;
  const priceMultiplier = !teamMembersCount ? 1 : teamMembersCount * 0.5;
  const monthlyAmountMultiplied = product.price.monthlyAmount * priceMultiplier;
  const monthlyAmountFormatted =
    (numberService.hasDecimals(monthlyAmountMultiplied)
      ? monthlyAmountMultiplied.toFixed(2)
      : monthlyAmountMultiplied.toFixed()) + moneyService.getCurrencySymbol(product.price.currency);
  const totalAmount = product.price.amount * priceMultiplier;
  const totalAmountFormatted =
    (numberService.hasDecimals(totalAmount) ? totalAmount.toFixed(2) : totalAmount.toFixed()) +
    moneyService.getCurrencySymbol(product.price.currency);
  const onBuyButtonClicked = async () => {
    if (product.metadata.is_drive) {
      dispatch(
        paymentThunks.checkoutThunk({
          product,
        }),
      );
    } else {
      dispatch(paymentThunks.teamsCheckoutThunk({ product, teamMembersCount }));
    }
  };
  const desktopBuyButtonLabel =
    isBuyButtonDisabled && isCurrentProduct ? i18n.get('general.loading.redirecting') : i18n.get('action.buy');
  const tabletBuyButtonLabel =
    isBuyButtonDisabled && isCurrentProduct
      ? i18n.get('general.loading.redirecting')
      : monthlyAmountFormatted + (isLifetime ? '' : '/' + i18n.get('general.time.month'));
  const sizeClassName = product.metadata.is_drive ? 'square' : '';

  useEffect(() => {
    setIsLgScreen(screenService.isLg());
  });

  const desktopTemplate = (
    <div className={`${sizeClassName} product-item desktop`}>
      {/* SIMPLE NAME */}
      <h4 className="mx-auto rounded-3xl px-4 py-1 bg-l-neutral-20 text-m-neutral-80 font-semibold mb-4 w-min">
        {product.metadata.simple_name}
      </h4>

      {/* MONTHLY AMOUNT */}
      <div className="flex justify-center items-center">
        <span className="text-3xl font-bold mr-2">{monthlyAmountFormatted}</span>
        {!isLifetime && <span className="h-fit">/{i18n.get('general.time.month')}</span>}
      </div>

      {/* TOTAL AMOUNT */}
      {product.metadata.is_teams ? (
        <div className="bg-l-neutral-10 border border-l-neutral-20 rounded-lg mt-6 mb-2 p-4">
          <NumberInput
            className="mb-2"
            initialValue={teamMembersCount}
            min={2}
            unitLabel="users"
            onChange={setTeamMembersCount}
          />

          <div className="w-full flex justify-center items-center">
            {isLifetime ? (
              <span className="text-xs text-m-neutral-100">{i18n.get('general.billing.oneTimePayment')}</span>
            ) : (
              <Fragment>
                <span className="text-xs mr-1">{moneyService.getCurrencySymbol(product.price.currency)}</span>
                <span className="mr-1">{totalAmount.toFixed()}</span>
                <span className="text-xs text-m-neutral-100">
                  /{i18n.get(`general.renewalPeriod.${product.renewalPeriod}`).toLowerCase()}
                </span>
              </Fragment>
            )}
          </div>
        </div>
      ) : (
        <span className="text-center text-xs text-m-neutral-80 mt-2 mb-4">
          {isLifetime
            ? i18n.get('general.billing.oneTimePayment')
            : i18n.get('general.billing.billedEachPeriod', {
                price: totalAmountFormatted,
                period: i18n.get(`general.renewalPeriod.${product.renewalPeriod}`).toLowerCase(),
              })}
        </span>
      )}
      <div />
      <BaseButton className="w-full primary font-semibold" disabled={isBuyButtonDisabled} onClick={onBuyButtonClicked}>
        {desktopBuyButtonLabel}
      </BaseButton>
    </div>
  );
  const tabletTemplate = (
    <div className="product-item tablet">
      <div className="w-36">
        <span className="block text-xl font-bold">{product.metadata.simple_name}</span>
        <span className="block text-xs text-m-neutral-80">
          {isLifetime
            ? i18n.get('general.billing.oneTimePayment')
            : i18n.get('general.billing.billedEachPeriod', {
                price: totalAmountFormatted,
                period: i18n.get(`general.renewalPeriod.${product.renewalPeriod}`).toLowerCase(),
              })}
        </span>
      </div>

      {product.metadata.is_teams && (
        <NumberInput initialValue={teamMembersCount} min={2} unitLabel="users" onChange={setTeamMembersCount} />
      )}

      <BaseButton className="primary font-semibold w-36" disabled={isBuyButtonDisabled}>
        {tabletBuyButtonLabel}
      </BaseButton>
    </div>
  );

  return isLgScreen ? desktopTemplate : tabletTemplate;
};

export default ProductItem;
