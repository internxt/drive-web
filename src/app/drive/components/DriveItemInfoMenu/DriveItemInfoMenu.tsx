import UilTimes from '@iconscout/react-unicons/icons/uil-times';
import UilFolderNetwork from '@iconscout/react-unicons/icons/uil-folder-network';
import { SVGProps } from 'react';

import './DriveItemInfoMenu.scss';

interface DriveItemInfoMenuProps {
  title: string;
  icon: React.FunctionComponent<SVGProps<SVGSVGElement>>;
  features: { label: string; value: string }[];
  onClose: () => void;
}

const DriveItemInfoMenu = (props: DriveItemInfoMenuProps): JSX.Element => {
  const featuresList = props.features.map((feature, index) => (
    <div key={index} className="file-activity-info-item">
      <span className="label">{feature.label}</span>
      <span className="value overflow-hidden text-ellipsis whitespace-nowrap">{feature.value}</span>
    </div>
  ));
  let template: JSX.Element = <div></div>;

  template = (
    <div className="mr-8 w-activity min-w-activity rounded-md border-l border-gray-5 bg-white pl-6 pt-6">
      {/* HEADER */}
      <div className="mb-4 flex items-center">
        <div className="min-w-9 flex h-9 w-9 items-center">
          <props.icon className="h-full" />
        </div>
        <span
          className="mx-3 block grow
         overflow-hidden text-ellipsis whitespace-nowrap text-sm text-gray-80"
        >
          {props.title}
        </span>
        <div
          className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-1/2 bg-gray-5"
          onClick={props.onClose}
        >
          <UilTimes className="text-primary" />
        </div>
      </div>

      {/* TABS */}
      <div className="mb-4 border-b border-l-gray-20 text-center">
        <div className="file-activity-tabs-inner-container">
          <div className="w-1/2 border-b border-primary py-3 text-gray-80">Info</div>
        </div>
      </div>

      {/* INFO TAB CONTENT */}
      <div className="relative border-l border-dashed border-l-gray-20 pl-4">
        <div className="absolute -left-2 w-4 bg-white text-gray-70">
          <UilFolderNetwork className="w-full" />
        </div>

        {featuresList}
      </div>
    </div>
  );

  return template;
};

export default DriveItemInfoMenu;
