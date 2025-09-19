import { Dialog } from '@internxt/ui';

interface UpgradeDialogProps {
  isDialogOpen: boolean;
  onAccept: () => void;
  onCloseDialog: () => void;
  title: string;
  subtitle: string;
  primaryAction: string;
  secondaryAction: string;
}

export const UpgradeDialog = ({
  isDialogOpen,
  title,
  subtitle,
  primaryAction,
  secondaryAction,
  onAccept,
  onCloseDialog,
}: UpgradeDialogProps) => (
  <Dialog
    isOpen={isDialogOpen}
    onClose={onCloseDialog}
    onSecondaryAction={onCloseDialog}
    onPrimaryAction={onAccept}
    title={title}
    subtitle={subtitle}
    primaryAction={primaryAction}
    secondaryAction={secondaryAction}
    primaryActionColor="primary"
  />
);
