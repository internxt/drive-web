import { X } from '@phosphor-icons/react';
import React from 'react';
import { ReactComponent as SendIcon } from 'assets/images/shared-file/visual.svg';
import BackgroundImage from 'assets/images/shared-file/banner-bg.png';

export interface Props {
  sendBannerVisible: boolean;
  setIsSendBannerVisible: (value: boolean) => void;
}

const SendBanner = (props: Props) => {
  const onClose = () => {
    props.setIsSendBannerVisible(false);
  };

  return (
    <div
      className={`${
        props.sendBannerVisible ? 'flex' : 'hidden'
      }  fixed bottom-0 left-0 right-0 top-0 z-50 h-screen bg-black/50 px-10 lg:px-0`}
    >
      <div
        className={`${props.sendBannerVisible ? 'flex' : 'hidden'} absolute left-1/2 top-1/2 flex
        w-auto max-w-[800px] -translate-x-1/2 -translate-y-1/2 flex-col rounded-2xl text-gray-100`}
        style={{ backgroundImage: `url(${BackgroundImage})` }}
      >
        <button className="absolute right-0 m-7 flex w-auto text-white" onClick={onClose}>
          <X size={32} />
        </button>
        <div className="flex flex-col space-x-20 p-14 lg:flex-row lg:p-20">
          <div className="flex w-full flex-col items-center justify-center text-center lg:items-start lg:text-left">
            <div className="flex max-w-[323px] flex-col items-start">
              <p className="text-5xl font-bold text-white lg:w-48">Try out Internxt</p>
              <p className=" pt-4 text-3xl font-semibold text-white lg:w-96">
                Encrypt, save and share large files with Internxt.
              </p>
            </div>
            <div className="flex pt-6">
              <button
                className="relative flex h-14 w-48 flex-row items-center justify-center space-x-4 rounded-full bg-primary px-8 text-base text-white transition duration-100 focus:outline-none focus-visible:bg-primary-dark active:bg-primary-dark sm:text-lg"
                onClick={() => {
                  window.location.replace('https://internxt.com');
                }}
              >
                Start for free!
              </button>
            </div>
          </div>
          <div className="ml-80 hidden items-center lg:flex">
            <div className="flex w-[340px]">
              <SendIcon height={208} width={208} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SendBanner;
