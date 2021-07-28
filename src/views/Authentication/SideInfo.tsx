import Carousel, { Dots } from '@brainhubeu/react-carousel';
import '@brainhubeu/react-carousel/lib/style.css';
import { useEffect } from 'react';
import { useState } from 'react';
import './SideInfo.scss';
import sideInfoBackground from '../../assets/images/sideinfo-background.jpg';

const SideInfo = ({ texts }: { texts: { label: string, sublabel: string, reviews: { name: string, review: string }[] } }): JSX.Element => {
  const [value, setValue] = useState(0);

  const onChange = (newValue: number) => setValue(newValue);

  useEffect(() => {
    const interval = setInterval(() => {
      setValue(prevState => prevState + 1 > texts.reviews.length ? 0 : prevState + 1);
      console.log('uwu');
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className='flex flex-col justify-between items-start w-104 min-w-104 h-full bg-gradient-to-b from-blue-60 to-blue-80 text-white p-12 relative'>
      <img className='absolute top-0 left-0 object-cover w-full h-full' src={sideInfoBackground} alt='' />

      <div className='flex flex-col z-10'>
        <span className='text-xl font-bold tracking-0.3'>{texts.label}</span>
        <span className='text-supporting-2 tracking-0.3'>{texts.sublabel}</span>
      </div>

      <div className='w-full z-10'>
        <Carousel draggable={false} value={value}>
          {texts.reviews.map((review, index) => (
            <div className='flex flex-col' key={index}>
              <span className='text-xl'>{review.name}</span>

              <span className='w-50 text-xs mt-2'>{review.review}</span>
            </div>
          ))}
        </Carousel>
        <Dots onChange={onChange} className='mt-2' value={value} number={texts.reviews.length} />
      </div>
    </div >
  );
};

export default SideInfo;
