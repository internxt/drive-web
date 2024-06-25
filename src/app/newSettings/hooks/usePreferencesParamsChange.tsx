import { useState, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { uiActions } from '../../store/slices/ui';
import { RootState } from '../../store';

export const usePreferencesParamsChange = () => {
  const dispatch = useAppDispatch();
  const params = new URLSearchParams(window.location.search);
  const isOpenParams = params.get('preferences') === 'open';
  const isOpenDialog = useAppSelector((state: RootState) => state.ui.isPreferencesDialogOpen);

  const [haveParamsChanged, setHaveParamsChanged] = useState(false);

  useEffect(() => {
    window.onpopstate = () => {
      setHaveParamsChanged(true);
    };
  }, []);

  useEffect(() => {
    setHaveParamsChanged(true);
  });

  useEffect(() => {
    if (isOpenParams) {
      dispatch(uiActions.setIsPreferencesDialogOpen(true));
    } else if (isOpenDialog) {
      dispatch(uiActions.setIsPreferencesDialogOpen(false));
    }
    setHaveParamsChanged(false);
  }, [haveParamsChanged]);

  return haveParamsChanged;
};
