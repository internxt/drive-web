import React from 'react';
import { useState } from 'react';
import FileActivity from '../../components/FileActivity/FileActivity';
import './NewXCloud.scss';
import SideNavigator from '../../components/layout/SideNavigator/SideNavigator';
import { useEffect } from 'react';
import { useAppDispatch } from '../../redux/hooks';
import { setHasConnection } from '../../redux/slices/networkSlice';
import FileLogger from '../../components/FileLogger';

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
    <div className="flex xcloud-layout overflow-hidden">
      <SideNavigator isVisible={isVisible} setIsVisible={setIsVisible} />

      <div className="flex-grow">
        2
      </div>

      <FileLogger />
      <FileActivity />
    </div>
  );
};

export default NewXCloud;
