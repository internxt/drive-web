import React from 'react';

interface SideInfoProps {
  texts: {
    label: string,
    title: string,
    subtitle: string,
    link: string,
    href: string
  }
}

const SideInfo = ({ texts }: SideInfoProps): JSX.Element => {
  return (
    <div className='flex flex-col justify-center w-104 min-w-104 h-full background-login bg-gradient-to-b from-blue-60 to-blue-80 pl-20 text-white'>
      <span className='text-xl font-semibold tracking-0.3'>{texts.label}</span>

      <span className='w-40 text-3xl mt-7'>{texts.title}</span>

      <span className='w-50 text-base mt-6'>{texts.subtitle}</span>

      <a className='text-base font-semibold mt-9' href={texts.href}>{texts.link}</a>
    </div>
  );
};

export default SideInfo;
