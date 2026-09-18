import { CheckIcon } from '@phosphor-icons/react';
import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';
import { BfCheckoutPlanSummary } from '../utils/getBfCheckoutPlanSummary';

interface BfCheckoutOrderSummaryProps {
  planSummary: BfCheckoutPlanSummary;
}

const SummaryRow = ({ label, value }: { label: string; value: string }) => (
  <div className="flex flex-row items-center justify-between">
    <p className="text-base text-[#A7B4C8]">{label}</p>
    <p className="text-base font-medium text-white">{value}</p>
  </div>
);

export const BfCheckoutOrderSummary = ({ planSummary }: BfCheckoutOrderSummaryProps): JSX.Element => {
  const { translate } = useTranslationContext();
  const {
    planLabel,
    billedLabel,
    currencySymbol,
    discountedAmount,
    normalAmount,
    taxAmount,
    totalAmount,
    savingsAmount,
    discountPercent,
  } = planSummary;

  const hasDiscount = Boolean(discountPercent);
  const hasTaxes = Number(taxAmount) > 0;

  return (
    <div className="flex flex-col gap-4">
      {hasDiscount && (
        <div className="flex w-fit flex-row items-center gap-1.5 rounded-full border border-[#1E5B36] bg-[#0E2B1B] px-3 py-1.5">
          <CheckIcon size={16} weight="bold" className="text-[#3BD16F]" />
          <p className="text-sm font-semibold text-[#3BD16F]">
            {translate('checkout.bfCheckout.summary.discountApplied', { percent: discountPercent })}
          </p>
        </div>
      )}

      <div className="flex flex-row items-start justify-between gap-4">
        <p className="text-2xl font-bold text-white">{planLabel}</p>
        {hasDiscount && (
          <p className="pt-1 text-lg text-[#7D8CA3] line-through">
            {currencySymbol}
            {normalAmount}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-3">
        <SummaryRow label={billedLabel} value={`${currencySymbol}${discountedAmount}`} />
        {hasTaxes && (
          <SummaryRow
            label={translate('checkout.bfCheckout.summary.estimatedTax')}
            value={`${currencySymbol}${taxAmount}`}
          />
        )}
        {hasDiscount && (
          <div className="flex flex-row items-center justify-between">
            <p className="text-base font-medium text-[#3BD16F]">
              {translate('checkout.productCard.saving', { percent: discountPercent })}
            </p>
            <p className="text-base font-medium text-[#3BD16F]">
              -{currencySymbol}
              {savingsAmount}
            </p>
          </div>
        )}
      </div>

      <div className="border-t border-[#202D45]" />

      <div className="flex flex-row items-center justify-between">
        <p className="text-3xl font-bold text-white">{translate('checkout.productCard.total')}</p>
        <p className="text-3xl font-bold text-white">
          {currencySymbol}
          {totalAmount}
        </p>
      </div>
    </div>
  );
};
