import { useSelector } from 'react-redux';

import BaseDialog from 'app/shared/components/BaseDialog/BaseDialog';
import { useState } from 'react';
import BaseButton from 'app/shared/components/forms/BaseButton';
import errorService from 'app/core/services/error.service';
import storageThunks from 'app/store/slices/storage/storage.thunks';
import { uiActions } from 'app/store/slices/ui';
import { setItemsToMove } from 'app/store/slices/storage';
import { useAppDispatch, useAppSelector } from 'app/store/hooks';
import { RootState } from 'app/store';
import { DriveItemData } from '../../types';
import i18n from 'app/i18n/services/i18n.service';
//import MoveItemsPayload from 'app/store/slices/storage/storage.thunks/moveItemsThunk';

import './MoveItemsDialog.scss';

interface MoveItemsDialogProps {
  onItemsMoved?: () => void;
  destinationFolderId: number;
  isTrash?:boolean;
}

const MoveItemsDialog = (props: MoveItemsDialogProps): JSX.Element => {
  const itemsToMove: DriveItemData[] = useSelector((state: RootState) => state.storage.itemsToMove);
  const [isLoading, setIsLoading] = useState(false);
  const dispatch = useAppDispatch();
  const isOpen = useAppSelector((state: RootState) => state.ui.isMoveItemsDialogOpen);

  const onClose = (): void => {
    dispatch(uiActions.setIsMoveItemsDialogOpen(false));
    dispatch(setItemsToMove([]));
  };

  const onAccept = async (): Promise<void> => {
    try {
      setIsLoading(true);
      if (itemsToMove.length > 0) {
        await dispatch(storageThunks.moveItemsThunk({
          items: itemsToMove,
          destinationFolderId: props.destinationFolderId,
        }));
      }

      props.onItemsMoved && props.onItemsMoved();

      setIsLoading(false);
      onClose();
    } catch (err: unknown) {
      const castedError = errorService.castError(err);

      setIsLoading(false);

      console.log(castedError.message);
    }
  };

  return (
    <BaseDialog isOpen={isOpen} title={`${props.isTrash? 'Recover':'Move'} ${itemsToMove.length > 0? (itemsToMove.length+1)+' items': ('"'+itemsToMove[0].name+'"')}`} onClose={onClose}>
    

      <div className="flex justify-center items-center bg-neutral-20 py-6 mt-6">
        <div className="flex w-64">
          <BaseButton onClick={() => onClose()} className="cancel w-full mr-2">
            {i18n.get('actions.cancel')}
          </BaseButton>
          <BaseButton className="primary w-11/12 ml-2" disabled={isLoading} onClick={() => onAccept()}>
            {isLoading ? 'Moving...' : 'Move'}
          </BaseButton>
        </div>
      </div>
    </BaseDialog>
  );
};

export default MoveItemsDialog;
