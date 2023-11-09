import { X } from '@phosphor-icons/react';
import NeonBlur from 'assets/images/banner/infinity.svg';
import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';

const BlackFridayBanner = ({ showBanner, onClose }: { showBanner: boolean; onClose: () => void }): JSX.Element => {
  const { translate } = useTranslationContext();

  return (
    <div
      className={`${showBanner ? 'flex' : 'hidden'} 
         absolute top-0 left-0 right-0 bottom-0 z-10 bg-black bg-opacity-40`}
    >
      <div
        className={`absolute top-1/2 left-1/2 flex h-auto max-w-4xl -translate-y-1/2 -translate-x-1/2
        transform flex-col overflow-hidden rounded-2xl bg-primary-dark  text-neutral-900`}
        style={{
          backgroundImage: `url(${NeonBlur})`,
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          backgroundSize: '1100px 611px',
        }}
      >
        <button className="absolute right-0 m-5 flex w-auto text-white" onClick={onClose}>
          <X size={32} />
        </button>
        <div className="flex flex-col py-10 px-40"></div>
      </div>
    </div>
  );
};

export default BlackFridayBanner;
