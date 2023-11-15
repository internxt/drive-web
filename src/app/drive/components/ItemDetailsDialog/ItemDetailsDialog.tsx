import { RootState } from 'app/store';
import { useAppSelector } from 'app/store/hooks';
import { useEffect } from 'react';

const ItemDetailsDialog = () => {
  const isOpen = useAppSelector((state: RootState) => state.ui.isItemDetailsDialogOpen);
  const item = useAppSelector((state: RootState) => state.ui.itemDetails);

  useEffect(() => {
    console.log('[ITEM DETAILS DIALOG]:', item);
  }, []);

  return <></>;
};

export default ItemDetailsDialog;
