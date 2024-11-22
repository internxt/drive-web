import { useCallback, useContext } from 'react';
import { ActionDialog, DialogManagerContext } from './ActionDialogManager.context';

export const useActionDialog = () => {
  const ctx = useContext(DialogManagerContext);
  if (!ctx) {
    throw new Error('useActionDialog must be used within a DialogManagerProvider');
  }

  const isDialogOpen = useCallback(
    (key: ActionDialog) => {
      return ctx.actionDialogs[key]?.isOpen || false;
    },
    [ctx.actionDialogs],
  );

  const getDialogData = useCallback(
    (key: ActionDialog) => {
      return ctx.actionDialogs[key]?.data || null;
    },
    [ctx.actionDialogs],
  );

  return {
    isDialogOpen,
    getDialogData,
    openDialog: ctx.openDialog,
    closeDialog: ctx.closeDialog,
  };
};
