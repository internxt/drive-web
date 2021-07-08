import React from 'react';
import { useState } from 'react';
import FileActivity from '../../components/FileActivity/FileActivity';
import './NewXCloud.scss';
import SideNavigator from '../../components/layout/SideNavigator/SideNavigator';

interface NewXCloudProps {
}

const NewXCloud = (): NewXCloudProps => {
  const [isVisible, setIsVisible] = useState(true);

  return (
    <div className="App xcloud-layout flex">

      {/* <div className="w-sidenav-1280 bg-l-neutral-20">1</div> */}
      <SideNavigator isVisible={isVisible} setIsVisible={setIsVisible} />

      <div className="flex-grow">2</div>
      <FileActivity />

    </div>
  );
};

export default NewXCloud;
