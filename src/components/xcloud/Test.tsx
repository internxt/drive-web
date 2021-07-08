import React from 'react';
import { useState } from 'react';
import Header from '../layout/Header';
import SideNavigator from '../layout/SideNavigator/SideNavigator';

const Test = () => {
  const [isVisible, setIsVisible] = useState(true);

  return (
    <div className='grid grid-cols-12 h-full'>
      <SideNavigator isVisible={isVisible} setIsVisible={setIsVisible} />

      <div className={`${isVisible ? 'col-span-7' : 'col-span-8'}`}>
        <Header />
      </div>
      <div className='col-span-3 bg-gray-70'>sidebar 2</div>
    </div>
  );
};

export default Test;
