//import sideInfoBackground from '../../../../assets/images/sideinfo-background.jpg';
import bigLogo from 'assets/icons/big-logo.svg';

import './AuthSideInfo.scss';

const AuthSideInfo = ({ title, subtitle }: { title: string; subtitle: string }): JSX.Element => {
  return (
    <div
      className="bg-gray-5"
    >
      <img className=" object-cover"  width="110" src={bigLogo} alt="" />

      <div className="flex flex-col z-10">
        <span className="text-xl font-bold tracking-0.3">{title}</span>
        <span className="text-supporting-2 tracking-0.3">{subtitle}</span>
      </div>
    </div>
  );
};

export default AuthSideInfo;
