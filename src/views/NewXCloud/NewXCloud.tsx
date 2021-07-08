import React from 'react';
import { useState } from 'react';
import FileActivity from '../../components/FileActivity/FileActivity';
import './NewXCloud.scss';
import SideNavigator from '../../components/layout/SideNavigator/SideNavigator';
import Header from '../../components/layout/Header';

interface NewXCloudProps {
}

const NewXCloud = (): NewXCloudProps => {
  const [isVisible, setIsVisible] = useState(true);

  return (
    <div className="App xcloud-layout flex">
      <SideNavigator isVisible={isVisible} setIsVisible={setIsVisible} />

      <div className="flex-grow">
        <Header />
      </div>
      <FileActivity />

    </div>
  );
};

export default NewXCloud;
