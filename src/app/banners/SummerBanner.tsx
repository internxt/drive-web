import { X } from '@phosphor-icons/react';
import BackgroundImage from 'assets/images/banner/BannerInternal-SummerCampaign-800x450-EN.svg';
import { ReactComponent as InternxtLogo } from 'assets/images/banner/inxt-logo.svg';

const SummerBanner = ({ showBanner, onClose }: { showBanner: boolean; onClose: () => void }) => {
  return (
    <section
      className={`${
        showBanner ? 'flex' : 'hidden'
      }  fixed bottom-0 left-0 right-0 top-0 z-50 h-screen bg-black/50 px-5 lg:px-0`}
    >
      <div
        className={`${showBanner ? 'flex' : 'hidden'} text-neutral-900 absolute left-1/2 top-1/2
        flex w-max max-w-4xl -translate-x-1/2 -translate-y-1/2 flex-col rounded-2xl`}
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
        <div className="flex cursor-pointer flex-col space-x-20 p-14 py-14 lg:flex-row lg:px-36">
          <div className="flex flex-col items-center justify-center space-y-9 text-center">
            <InternxtLogo />
            <div className="flex flex-col items-center justify-center space-y-6">
              <div className="bg-mint flex max-w-[443px] items-center justify-center rounded-xl px-10 py-3 text-white">
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
