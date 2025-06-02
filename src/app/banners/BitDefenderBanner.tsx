import { X } from '@phosphor-icons/react';
import BitDefenderBanner from 'assets/images/banner/Ban_Internext.jpg';

interface BitdeFenderBannerProps {
  showBanner: boolean;
  onClose: () => void;
}

const BitdefenderBanner = ({ showBanner, onClose }: BitdeFenderBannerProps): JSX.Element => {
  const handleOnClick = () => {
    window.open('https://www.bitdefender.com/pages/consumer/en/new/trial/ts-trial-3m/internxt/', '_blank' , 'noopener');
  };

  return (
    <div
      className={`${
        showBanner ? 'flex' : 'hidden'
      } fixed bottom-0 left-0 right-0 top-0 z-50 h-screen bg-black bg-opacity-50 px-10 lg:px-0`}
    >
      <div
        className={
          ' fixed left-1/2 top-1/2 flex h-max -translate-x-[50%] -translate-y-[50%] flex-col overflow-hidden border-primary/7'
        }
      >
        <button
          id="close-banner"
          aria-label="close-banner"
          className="absolute right-0 m-4 flex rounded-md hover:bg-gray-1/10"
          onClick={onClose}
        >
          <X size={32} className="text-white" />
        </button>

        <div className="w-[450px] lg:w-[750px] ">
          <img
            src={BitDefenderBanner}
            alt="BitDefender Banner"
            width={900}
            height={160}
            style={{ cursor: 'pointer' }}
            onClick={handleOnClick}
          />
        </div>
      </div>
    </div>
  );
};

export default BitdefenderBanner;
