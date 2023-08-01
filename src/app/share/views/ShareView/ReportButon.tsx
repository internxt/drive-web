import { t } from 'i18next';

const handleReportShare = () => {
  const email = 'hello@internxt.com';
  const subject = 'Report Share Link';
  const linkURL = window.location.href;
  const body = `Hello, I want to warn you that link ${linkURL} contains a file/folder that <add reason here>, therefore, I request its removal and subsequent deletion. <Please provide any evidence supporting your claim>`;

  const mailtoLink = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  window.location.href = mailtoLink;
};

const ReportButton = (): JSX.Element => (
  <div className={'z-10 mt-2 flex h-10 w-full flex-row items-center justify-center rounded-lg bg-red-std'}>
    <button
      title="Report"
      onClick={handleReportShare}
      className="flex h-10 cursor-pointer flex-row items-center rounded-lg bg-white
                          bg-opacity-0 px-6 text-center font-medium transition
                          duration-50 ease-in-out hover:bg-opacity-10 focus:bg-opacity-5"
    >
      <span className="font-medium text-white">{t('actions.report')}</span>
    </button>
  </div>
);

export default ReportButton;
