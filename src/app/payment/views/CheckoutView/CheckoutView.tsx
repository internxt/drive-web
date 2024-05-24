import { CreateAccountComponent } from './components/CreateAccountComponent';
import { PaymentComponent } from './components/PaymentComponent';
import { ProductFeaturesComponent } from './components/ProductFeaturesComponent';
import { useState } from 'react';
import { HeaderComponent } from './components/Header';

const CheckoutView = () => {
  const [selectedPlan, setSelectedPlan] = useState<string>('200GB');

  return (
    <div className="flex h-full overflow-y-scroll bg-gray-1 px-16 py-10 lg:w-screen">
      <div className="mx-auto flex w-full max-w-screen-xl">
        <div className="flex w-full flex-col space-y-16">
          {/* Header */}
          <div className="flex flex-col space-y-16">
            <HeaderComponent />
            <p className="text-3xl font-bold text-gray-100">You're almost there! Checkout securely:</p>
          </div>
          <div className="relative flex flex-row justify-between">
            <div className="flex w-full max-w-xl flex-col space-y-14">
              <CreateAccountComponent />
              <PaymentComponent />
            </div>

            <div className="flex w-full max-w-lg flex-col">
              <ProductFeaturesComponent selectedPlan={selectedPlan} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CheckoutView;
