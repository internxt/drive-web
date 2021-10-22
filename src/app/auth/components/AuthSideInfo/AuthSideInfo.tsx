import sideInfoBackground from '../../../../assets/images/sideinfo-background.jpg';

import './AuthSideInfo.scss';

const AuthSideInfo = ({ title, subtitle }: { title: string; subtitle: string }): JSX.Element => {
  return (
    <div className="hidden md:flex flex-col justify-between items-start w-104 min-w-104 h-full bg-gradient-to-b from-blue-60 to-blue-80 text-white p-12 relative">
      <img className="absolute top-0 left-0 object-cover w-full h-full" src={sideInfoBackground} alt="" />

      <div className="flex flex-col z-10">
        <span className="text-xl font-bold tracking-0.3">{title}</span>
        <span className="text-supporting-2 tracking-0.3">{subtitle}</span>
      </div>
    </div>
  );
};

export default AuthSideInfo;
