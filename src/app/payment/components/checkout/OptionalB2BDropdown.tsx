import { Menu, Transition } from '@headlessui/react';
import { CaretDown, CaretUp } from '@phosphor-icons/react';
import TextInput from 'app/auth/components/TextInput/TextInput';
import { IFormValues } from 'app/core/types';
import { useState } from 'react';
import { FieldErrors, UseFormRegister } from 'react-hook-form';

interface OptionalB2BDropdownProps {
  errors: FieldErrors<IFormValues>;
  translate: (key: string, props?: Record<string, unknown>) => string;
  register: UseFormRegister<IFormValues>;
}

export const OptionalB2BDropdown = ({ errors, translate, register }: OptionalB2BDropdownProps) => {
  const [optionalAddressBillingDetailsDialogClicked, setOptionalAddressBillingDetailsDialogClicked] =
    useState<boolean>();

  return (
    <div className="flex w-full flex-col items-start gap-3 rounded-2xl border border-gray-10 bg-surface p-5">
      <Menu>
        <Menu.Button
          onKeyDown={(e) => e.preventDefault()}
          className={
            'flex h-full w-full flex-row items-center justify-between rounded-lg text-base transition-all duration-75 ease-in-out hover:underline'
          }
          onClick={() => setOptionalAddressBillingDetailsDialogClicked(!optionalAddressBillingDetailsDialogClicked)}
        >
          {translate('checkout.addressBilling.optional.cta')}
          {optionalAddressBillingDetailsDialogClicked ? (
            <CaretUp size={24} className="text-gray-60" />
          ) : (
            <CaretDown size={24} className="text-gray-60" />
          )}
        </Menu.Button>
        <Transition
          className={'left-0 w-full'}
          enter="transition duration-50 ease-out"
          enterFrom="scale-98 opacity-0"
          enterTo="scale-100 opacity-100"
          leave="transition duration-50 ease-out"
          leaveFrom="scale-98 opacity-100"
          leaveTo="scale-100 opacity-0"
        >
          <Menu.Items onKeyDown={(e) => e.stopPropagation()} className="flex w-full flex-col gap-5">
            <div
              tabIndex={0}
              role="menuitem"
              onKeyDown={(e) => e.stopPropagation()}
              className="flex w-full flex-col gap-1"
            >
              <p className="text-sm text-gray-80">{translate('checkout.addressBilling.optional.companyName')}</p>
              <TextInput
                placeholder={translate('checkout.addressBilling.optional.companyName')}
                label="companyName"
                error={errors.companyName}
                className="!w-full"
                type="text"
                register={register}
                required={true}
              />
            </div>
            <div
              tabIndex={0}
              role="menuitem"
              onKeyDown={(e) => e.stopPropagation()}
              className="flex w-full flex-col gap-1"
            >
              <p className="text-sm text-gray-80">{translate('checkout.addressBilling.optional.companyVatId')}</p>
              <TextInput
                placeholder={translate('checkout.addressBilling.optional.companyVatId')}
                label="companyVatId"
                error={errors.companyVatId}
                className="!w-full"
                type="text"
                register={register}
                required={true}
              />
            </div>
          </Menu.Items>
        </Transition>
      </Menu>
    </div>
  );
};
