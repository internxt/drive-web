import React from 'react';
import { useState } from 'react';
import FileActivity from '../../components/FileActivity/FileActivity';
import './NewXCloud.scss';
import SideNavigator from '../../components/layout/SideNavigator/SideNavigator';
import { useEffect } from 'react';
import { useAppDispatch } from '../../redux/hooks';
import { setHasConnection } from '../../redux/slices/networkSlice';

interface NewXCloudProps {
}

const NewXCloud = (): NewXCloudProps => {
  const [isVisible, setIsVisible] = useState(true);
  const dispatch = useAppDispatch();

  useEffect(() => {
    window.addEventListener('offline', () => {
      dispatch(setHasConnection(false));
    });
    window.addEventListener('online', () => {
      dispatch(setHasConnection(true));
    });
  }, []);

  return (
    <div className="App xcloud-layout flex">
      <SideNavigator isVisible={isVisible} setIsVisible={setIsVisible} />

      <div className="flex-grow">
        2
      </div>
      <FileActivity />

    </div>
  );
};

export default NewXCloud;
