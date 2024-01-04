import folderBack from '../../../../assets/images/signup-animation/folder-back.svg';
import folderFront from '../../../../assets/images/signup-animation/folder-front.svg';
import fileZIP from '../../../../assets/images/signup-animation/zip.svg';
import fileDOC from '../../../../assets/images/signup-animation/doc.svg';
import filePDF from '../../../../assets/images/signup-animation/pdf.svg';
import { useEffect, useState } from 'react';

const PreparingWorkspaceAnimation = (): JSX.Element => {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setStep((steps) => (steps >= 18 ? 0 : steps + 1));
    }, 100);
    return () => clearInterval(interval);
  }, [step]);

  return (
    <div className="flex h-full w-full cursor-default flex-col items-center justify-center">
      <div className="pointer-events-none relative mb-4 h-32 w-40">
        <img className="absolute left-0 top-0 h-full w-full object-contain" src={folderBack} alt="" />
        <img
          className={`absolute h-16 w-16 object-contain transition-all duration-250 ease-in-out
          ${
            step >= 3
              ? '-top-3 left-1/3 -translate-x-10 -rotate-12 scale-90'
              : 'left-1/3 top-12 -translate-x-2 -rotate-12 scale-50'
          }`}
          src={filePDF}
          alt=""
        />
        <img
          className={`absolute h-16 w-16 object-contain transition-all duration-250 ease-in-out
          ${
            step >= 6
              ? '-top-2 left-1/2 -translate-x-7 rotate-3 scale-90'
              : 'left-1/2 top-10 -translate-x-8 rotate-3 scale-50'
          }`}
          src={fileDOC}
          alt=""
        />
        <img
          className={`absolute h-16 w-16 object-contain transition-all duration-250 ease-in-out
          ${
            step >= 9
              ? 'left-1/2 top-0 translate-x-2 rotate-30 scale-90'
              : 'left-1/2 top-10 -translate-x-6 rotate-30 scale-50'
          }`}
          src={fileZIP}
          alt=""
        />
        <img className="absolute left-0 top-0 h-full w-full object-contain" src={folderFront} alt="" />
      </div>

      <div className="flex flex-col items-center justify-center">
        <p className="text-2xl font-semibold text-gray-90">Preparing your workspace</p>
        <div className="relative text-base font-medium text-gray-40">This may take a few seconds...</div>
      </div>
    </div>
  );
};

export default PreparingWorkspaceAnimation;
