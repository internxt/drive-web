import copy from 'copy-to-clipboard';
import { Copy } from '@phosphor-icons/react';
import { useState } from 'react';
import Tooltip from '../Tooltip';

export default function Copyable({ className = '', text }: { className?: string; text: string }): JSX.Element {
  const [justCopied, setJustCopied] = useState(false);

  function onCopy() {
    copy(text);
    setJustCopied(true);
    setTimeout(() => setJustCopied(false), 1000);
  }
  return (
    <div
      className={`${className} flex h-11 items-center justify-between rounded-md border border-gray-10 bg-gray-5 px-4`}
    >
      <p className="select-text text-gray-80">{text}</p>
      <Tooltip
        className="ml-6"
        popsFrom="top"
        title={justCopied ? 'Copied!' : 'Copy to clipboard'}
        delayInMs={justCopied ? 500 : undefined}
      >
        <button disabled={justCopied} onClick={onCopy}>
          <Copy className="shrink-0 text-gray-50 hover:text-gray-60" size={24} />
        </button>
      </Tooltip>
    </div>
  );
}
