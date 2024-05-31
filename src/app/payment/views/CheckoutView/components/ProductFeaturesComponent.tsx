import { Menu, Transition } from '@headlessui/react';
import { DisplayPrice } from '@internxt/sdk/dist/drive/payments/types';
import { Check } from '@phosphor-icons/react';
import { bytesToString } from 'app/drive/services/size.service';
import Button from 'app/shared/components/Button/Button';
import { ReactComponent as GuaranteeDays } from 'assets/icons/30-days.svg';

interface ProductFeaturesComponentProps {
  selectedPlan: DisplayPrice;
}

const Separator = () => <div className="border border-gray-10" />;

export const ProductFeaturesComponent = ({ selectedPlan }: ProductFeaturesComponentProps) => {
  const bytes = bytesToString(selectedPlan.bytes);

  const features = [
    `${bytes} encrypted storage`,
    'Encrypted file and folder sharing',
    'Password-protected file sharing',
    'Access your files from any device',
    'Get access to all our services',
    'Upload files up to 20GB',
    'Two-factor authentication (2FA)',
    'Premium customer support',
    '30-day money-back guarantee',
  ];

  return (
    <div className="sticky block w-full flex-col space-y-4">
      <div className="flex w-full flex-row items-center justify-between space-x-4">
        <p className="text-2xl font-semibold text-gray-100">Order summary</p>
        <div className="flex flex-row space-x-2">
          <GuaranteeDays className="h-12" />
        </div>
      </div>
      <div className="flex w-full rounded-2xl border-gray-10 bg-surface p-5">
        <div className="flex w-full flex-col space-y-5">
          <p>Selected plan</p>
          <p className="text-2xl font-bold text-gray-100">{bytes} - 1 month plan</p>
          <div className="flex flex-row items-center justify-between text-gray-100">
            <p className="font-medium">Billed monthly</p>
            <p className="font-semibold">{selectedPlan.amount}€</p>
          </div>
          <div className="flex flex-row items-center justify-between font-semibold">
            {/* <div className="flex flex-row items-center space-x-2 text-green-dark">
              <SealPercent weight="fill" size={24} />
              <p className="">You're saving 75%</p>
            </div>
            <p className="text-gray-50 line-through">4.99€</p> */}
          </div>
          <Separator />
          <div className="flex flex-col space-y-5">
            <p className="font-medium text-gray-100">Plan details:</p>
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
            <p>Total:</p>
            <p>{selectedPlan.amount}€</p>
          </div>
          <Separator />
          <Menu>
            <Menu.Button className={'flex h-full w-full rounded-lg text-base transition-all duration-75 ease-in-out'}>
              Add coupon
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
                  <p className="text-sm text-gray-80">Coupon code</p>
                  <div className="flex w-full flex-row space-x-3">
                    <input
                      placeholder={'Coupon code'}
                      min={0}
                      required={true}
                      data-cy={'coupon-code-input'}
                      className={'inxt-input input-primary'}
                    />
                    <Button>Apply</Button>
                  </div>
                </div>
              </Menu.Items>
            </Transition>
          </Menu>
        </div>
      </div>
    </div>
  );
};
