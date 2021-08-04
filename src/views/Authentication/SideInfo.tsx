import { useEffect } from 'react';
import { useState } from 'react';
import './SideInfo.scss';
import sideInfoBackground from '../../assets/images/sideinfo-background.jpg';

const SideInfo = ({ texts }: { texts: { label: string, sublabel: string, reviews: { name: string, review: string }[] } }): JSX.Element => {
  const [value, setValue] = useState(0);

  const onChange = (newValue: number) => setValue(newValue);

  return (
    <div className='hidden md:flex flex-col justify-between items-start w-104 min-w-104 h-full bg-gradient-to-b from-blue-60 to-blue-80 text-white p-12 relative'>
      <img className='absolute top-0 left-0 object-cover w-full h-full' src={sideInfoBackground} alt='' />

      <div className='flex flex-col z-10'>
        <span className='text-xl font-bold tracking-0.3'>{texts.label}</span>
        <span className='text-supporting-2 tracking-0.3'>{texts.sublabel}</span>
      </div>

    </div >
  );
};

export default SideInfo;
