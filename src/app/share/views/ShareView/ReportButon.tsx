import { WarningCircle } from '@phosphor-icons/react';
import { t } from 'i18next';
import { Button } from '@internxt/ui';

const handleReportShare = () => {
  const email = 'hello@internxt.com';
  const subject = 'Report Share Link';
  const linkURL = window.location.href;
  const body = `Hello, I want to warn you that link ${linkURL} contains a file/folder that <add reason here>, therefore, I request its removal and subsequent deletion. <Please provide any evidence supporting your claim>`;

  const mailtoLink = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  window.location.href = mailtoLink;
};

const ReportButton = (): JSX.Element => (
  <Button variant="secondary" onClick={handleReportShare}>
    <WarningCircle height={24} width={24} className="text-gray-80" />
    <span className="ml-2">{t('actions.report')}</span>
  </Button>
);

export default ReportButton;
