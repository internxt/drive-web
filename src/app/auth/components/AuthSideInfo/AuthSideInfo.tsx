//import sideInfoBackground from '../../../../assets/images/sideinfo-background.jpg';
import bigLogo from 'assets/icons/big-logo.svg';

import './AuthSideInfo.scss';

const AuthSideInfo = ({ title, subtitle }: { title: string; subtitle: string }): JSX.Element => {
  return (
    <div className="bg-gray-5">
      <img className=" object-cover" width="110" src={bigLogo} alt="" />

      <div className="z-10 flex flex-col">
        <span className="text-xl font-bold">{title}</span>
        <span className="text-supporting-2">{subtitle}</span>
      </div>
    </div>
  );
};

export default AuthSideInfo;
