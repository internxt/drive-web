import React, { FC, ReactNode, useContext, useMemo, useState, useCallback } from 'react';

export enum ActionDialog {
  MoveItem = 'move-item',
  createFolder = 'create-folder',
  fileViewer = 'file-viewer',
  ShareItem = 'share-item',
  ClearTrash = 'clear-trash',
  ItemDetails = 'item-details',
  StopSharingAndMoveToTrash = 'stop-sharing-and-move-to-trash',
  EditItem = 'edit-item',
  NameCollision = 'name-collision',
  ModifyStorage = 'modify-storage',
}

interface ActionDialogState {
  isOpen: boolean;
  key: ActionDialog;
  data?: unknown;
}

type DialogActionConfig = { closeAllDialogsFirst?: boolean; data?: unknown };

export type ActionDialogContextProps = {
  actionDialogs: Partial<Record<ActionDialog, ActionDialogState>>;
  openDialog: (key: ActionDialog, config?: DialogActionConfig) => void;
  closeDialog: (key: ActionDialog, config?: DialogActionConfig) => void;
};

export const DialogManagerContext = React.createContext<ActionDialogContextProps | undefined>(undefined);

export const DialogManagerProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const [actionDialogs, setActionDialogs] = useState<Partial<Record<ActionDialog, ActionDialogState>>>({});

  const openDialog = useCallback((dialogKey: ActionDialog, config?: DialogActionConfig) => {
    setActionDialogs((prevDialogs) => {
      const newDialogs = config?.closeAllDialogsFirst ? {} : { ...prevDialogs };
      newDialogs[dialogKey] = { isOpen: true, key: dialogKey, data: config?.data };
      return newDialogs;
    });
  }, []);

  const closeDialog = useCallback((dialogKey: ActionDialog) => {
    setActionDialogs((prevDialogs) => {
      return {
        ...prevDialogs,
        [dialogKey]: { ...prevDialogs[dialogKey], isOpen: false, data: null },
      };
    });
  }, []);

  const memoizedValue = useMemo(
    () => ({
      actionDialogs,
      openDialog,
      closeDialog,
    }),
    [actionDialogs, openDialog, closeDialog],
  );

  return <DialogManagerContext.Provider value={memoizedValue}>{children}</DialogManagerContext.Provider>;
};

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
