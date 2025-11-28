import { Dialog } from '@internxt/ui';

interface UpgradeDialogProps {
  isDialogOpen: boolean;
  onAccept: () => void;
  onCloseDialog: () => void;
  title: string;
  subtitle: string;
  primaryAction: string | JSX.Element;
  secondaryAction: string | JSX.Element;
  maxWidth?: 'sm' | 'md' | 'lg';
}

export const UpgradeDialog = ({
  isDialogOpen,
  title,
  subtitle,
  primaryAction,
  secondaryAction,
  onAccept,
  onCloseDialog,
  maxWidth,
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
    maxWidth={maxWidth}
  />
);
