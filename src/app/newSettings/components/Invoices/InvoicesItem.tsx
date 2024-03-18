import { DownloadSimple } from '@phosphor-icons/react';

const InvoicesItem = ({
  date,
  storage,
  amount,
  pdf,
  isLastItem,
}: {
  date: string;
  storage: string;
  amount: string;
  pdf: string;
  isLastItem: boolean;
}) => {
  return (
    <div
      className={`-mx-5 flex flex-row justify-between border-gray-10 bg-surface p-2 text-base font-medium text-gray-100 hover:bg-gray-5 dark:bg-gray-1 dark:hover:bg-gray-5 ${
        isLastItem ? 'rounded-b-xl' : ' border-b'
      }`}
    >
      <div className="grow pl-3">{date}</div>
      <div className="w-32 pl-5 text-base font-normal text-gray-60">{storage}</div>
      <div className="flex w-56 flex-row items-center justify-between pl-5 text-base font-normal text-gray-60">
        {amount}
        <a className="px-2 text-gray-100" href={pdf} target="_blank" rel="noopener noreferrer">
          <DownloadSimple colorRendering={'bg-gray-100'} size={20} />
        </a>
      </div>
    </div>
  );
};

export default InvoicesItem;
