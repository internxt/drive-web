import { useState, useEffect } from 'react';
import { X } from 'phosphor-react';
import paymentService from 'app/payment/services/payment.service';
import { useSelector } from 'react-redux';
import { RootState } from 'app/store';
import { UserSettings } from '@internxt/sdk/dist/shared/types/userSettings';
import { bytesToString } from 'app/drive/services/size.service';
import BackgroundImage from 'assets/images/banner/BannerInternal-SummerCampaign-800x450-EN.svg';
import { ReactComponent as InternxtLogo } from 'assets/images/banner/inxt-logo.svg';

const SummerBanner = ({ showBanner, onClose }: { showBanner: boolean; onClose: () => void }) => {
  const user = useSelector<RootState, UserSettings>((state) => state.user.user!);
  const [priceId, setPriceId] = useState<string>('');

  useEffect(() => {
    paymentService.getPrices().then((res) => {
      res.forEach((price) => {
        console.log(price);
        if (bytesToString(price.bytes) === '2TB' && price.interval === 'year') setPriceId(price.id);
      });
    });
  }, []);

  return (
    <section
      className={`${
        showBanner ? 'flex' : 'hidden'
      }  fixed top-0 left-0 right-0 bottom-0 z-50 h-screen bg-black bg-opacity-50 px-5 lg:px-0`}
    >
      <div
        className={`${showBanner ? 'flex' : 'hidden'} absolute top-1/2 left-1/2 flex
        w-auto max-w-4xl -translate-y-1/2 -translate-x-1/2 transform flex-col rounded-2xl text-neutral-900`}
        style={{
          backgroundImage: `url(${BackgroundImage})`,
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          backgroundSize: 'cover',
        }}
      >
        <button className="absolute right-0 m-7 flex w-auto text-white" onClick={onClose}>
          <X size={32} />
        </button>
        <div
          className="flex cursor-pointer flex-col items-center justify-center px-48 pt-20 pb-16"
          onClick={async () => {
            const response = await paymentService.createCheckoutSession({
              price_id: priceId,
              success_url: `${window.location.origin}/checkout/success`,
              cancel_url: `${window.location.origin}/checkout/cancel?price_id=${priceId}`,
              customer_email: user.email,
              coupon_code: '6FACDcgf',
            });
            localStorage.setItem('sessionId', response.sessionId);
            await paymentService.redirectToCheckout(response);
          }}
        >
          <div className="flex flex-col items-center justify-center space-y-9 text-center">
            <InternxtLogo />
            <div className="flex flex-col items-center justify-center space-y-6">
              <div className="flex max-w-[443px] items-center justify-center rounded-xl bg-mint px-10 py-3 text-white">
                <p className="text-4xl font-semibold">SUMMER DEAL!</p>
              </div>
              <div className="flex flex-col items-center text-white">
                <p className="text-8xl font-bold">90% off</p>
                <p className="pt-1 text-3xl font-bold">2TB PLAN FOR 1 YEAR</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default SummerBanner;
