import { X } from 'phosphor-react';
import React from 'react';
import { ReactComponent as SendIcon } from 'assets/images/shared-file/visual.svg';

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
      }  fixed top-0 left-0 right-0 bottom-0 z-50 h-screen bg-black bg-opacity-50 px-10`}
    >
      <div
        className={`${props.sendBannerVisible ? 'flex' : 'hidden'} absolute top-1/2 left-1/2 flex h-auto w-auto
        -translate-y-1/2 -translate-x-1/2 transform flex-col overflow-hidden rounded-2xl text-neutral-900`}
      >
        <button className="absolute  right-0 m-7 flex text-white" onClick={onClose}>
          <X size={32} />
        </button>
        <div className="flex w-auto flex-col p-14 lg:flex-row lg:p-20">
          <div className="flex flex-col items-center justify-center text-center lg:items-start lg:justify-between lg:pr-20 lg:text-left">
            <div className="flex flex-col items-start lg:max-w-[323px]">
              <p className="w-48 text-5xl font-bold text-white">Try it for yourself</p>
              <p className="w-full py-4 text-3xl font-semibold text-white">
                Encrypt and share large <br /> files with Internxt Send.
              </p>
            </div>
            <div className="flex pt-6">
              <button
                className="focus:outline-none relative flex h-14 w-48 flex-row items-center justify-center space-x-4 rounded-full bg-primary px-8 text-base text-white transition duration-100 focus-visible:bg-primary-dark active:bg-primary-dark sm:text-lg"
                onClick={() => {
                  window.location.replace('https://send.internxt.com');
                }}
              >
                Send for free!
              </button>
            </div>
          </div>
          <div className="hidden items-center lg:flex">
            <div className="flex w-[340px]">
              <SendIcon height={208} width={208} />
            </div>
          </div>
        </div>
        <div className="absolute flex  bg-center bg-no-repeat " />
      </div>
    </div>
  );
};

export default SendBanner;
