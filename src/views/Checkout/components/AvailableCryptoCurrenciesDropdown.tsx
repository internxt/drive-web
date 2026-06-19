import { Fragment, MouseEvent } from 'react';
import { Menu, MenuButton, MenuItem, MenuItems, Transition } from '@headlessui/react';
import { CryptoCurrency } from '@internxt/sdk/dist/payments/types';
import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';
import BitcoinLogo from 'assets/icons/checkout/bitcoin-logo.svg?react';

interface AvailableCryptoCurrenciesDropdownProps {
  availableCryptoCurrencies: CryptoCurrency[];
  selectedCurrency: string;
  isDropdownOpen: boolean;
  onDropdownClicked: () => void;
  onCryptoChanges: (crypto: string) => void;
}

export const AvailableCryptoCurrenciesDropdown = ({
  availableCryptoCurrencies,
  selectedCurrency,
  isDropdownOpen,
  onDropdownClicked,
  onCryptoChanges,
}: AvailableCryptoCurrenciesDropdownProps) => {
  const { translate } = useTranslationContext();
  const cryptoSelected = availableCryptoCurrencies.find(
    (crypto) => crypto.currencyId.toLowerCase() === selectedCurrency,
  );

  return (
    <div className="flex w-full flex-col items-start gap-3 rounded-2xl border border-gray-10 bg-surface p-2.5 px-3.5">
      <Menu>
        <MenuButton
          onKeyDown={(e) => e.preventDefault()}
          className={`flex h-full w-full flex-row items-center justify-between rounded-lg text-base transition-all duration-75 ease-in-out ${isDropdownOpen ? 'text-gray-100 dark:text-white' : 'text-[#6D6E78] hover:text-gray-100 hover:dark:text-white'}`}
          onClick={onDropdownClicked}
        >
          {cryptoSelected ? (
            <div className="flex flex-row gap-6 items-center">
              <img src={cryptoSelected.imageUrl} alt={cryptoSelected.name} className="h-6 w-6" />
              <span>{cryptoSelected.name}</span>
            </div>
          ) : (
            <div className="flex flex-row gap-6 items-center">
              <BitcoinLogo className="h-5 w-5" />
              <p className="text-sm font-semibold">{translate('checkout.crypto')}</p>
            </div>
          )}
        </MenuButton>
        <Transition
          show={isDropdownOpen}
          as={Fragment}
          enter="transition ease-out duration-200"
          enterFrom="transform opacity-0 scale-95"
          enterTo="transform opacity-100 scale-100"
          leave="transition duration-150"
          leaveFrom="transform opacity-100 scale-100"
          leaveTo="transform opacity-0 scale-95"
        >
          <MenuItems onKeyDown={(e) => e.stopPropagation()} className="flex w-full flex-col gap-2">
            <div className="flex flex-col w-full border border-gray-10" />
            {availableCryptoCurrencies.map((cryptoCurrency) => (
              <MenuItem key={cryptoCurrency.currencyId}>
                {({ focus }) => (
                  <button
                    onClick={(e: MouseEvent<HTMLButtonElement>) => {
                      e.preventDefault();
                      onCryptoChanges(cryptoCurrency.currencyId.toLowerCase());
                      onDropdownClicked();
                    }}
                    className={`flex w-full flex-row items-center rounded-md text-left ${focus ? 'bg-gray-10' : ''}`}
                  >
                    <div className="flex flex-row gap-5 py-2 items-center">
                      <img src={cryptoCurrency.imageUrl} alt={cryptoCurrency.name} className="h-5 w-5" />
                      <span>{cryptoCurrency.name}</span>
                    </div>
                  </button>
                )}
              </MenuItem>
            ))}
          </MenuItems>
        </Transition>
      </Menu>
    </div>
  );
};
