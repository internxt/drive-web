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
    <div className="flex flex-col h-screen w-screen justify-center items-center cursor-default">
      <div className="relative h-32 w-40 mb-4 pointer-events-none">
        <img className="absolute top-0 left-0 object-contain w-full h-full" src={folderBack} alt="" />
        <img
          className={`absolute object-contain w-16 h-16 transition-all duration-250 ease-in-out
          ${
            step >= 3
              ? '-top-3 left-1/3 transform -translate-x-10 -rotate-12 scale-90'
              : 'top-12 left-1/3 transform -translate-x-2 -rotate-12 scale-50'
          }`}
          src={filePDF}
          alt=""
        />
        <img
          className={`absolute object-contain w-16 h-16 transition-all duration-250 ease-in-out
          ${
            step >= 6
              ? '-top-2 left-1/2 transform -translate-x-7 rotate-3 scale-90'
              : 'top-10 left-1/2 transform -translate-x-8 rotate-3 scale-50'
          }`}
          src={fileDOC}
          alt=""
        />
        <img
          className={`absolute object-contain w-16 h-16 transition-all duration-250 ease-in-out
          ${
            step >= 9
              ? 'top-0 left-1/2 transform translate-x-2 rotate-30 scale-90'
              : 'top-10 left-1/2 transform -translate-x-6 rotate-30 scale-50'
          }`}
          src={fileZIP}
          alt=""
        />
        <img className="absolute top-0 left-0 object-contain w-full h-full" src={folderFront} alt="" />
      </div>

      <div className="flex flex-col items-center justify-center">
        <p className="text-2xl font-semibold text-cool-gray-90">Preparing your workspace</p>
        <div className="relative text-base font-medium text-cool-gray-40">This may take a few seconds...</div>
      </div>
    </div>
  );
};

export default PreparingWorkspaceAnimation;
