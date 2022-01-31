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
      <span className="value whitespace-nowrap overflow-ellipsis overflow-hidden">{feature.value}</span>
    </div>
  ));
  let template: JSX.Element = <div></div>;

  template = (
    <div className="w-activity min-w-activity bg-white rounded-4px pl-6 mr-8 border-l border-neutral-30 pt-6">
      {/* HEADER */}
      <div className="flex items-center mb-4">
        <div className="flex items-center min-w-9 w-9 h-9">
          <props.icon className="h-full" />
        </div>
        <span
          className="mx-3 overflow-hidden whitespace-nowrap\
         overflow-ellipsis block text-neutral-700 text-sm flex-grow"
        >
          {props.title}
        </span>
        <div
          className="w-8 h-8 rounded-1/2 bg-neutral-20 cursor-pointer justify-center items-center flex"
          onClick={props.onClose}
        >
          <UilTimes className="text-blue-60" />
        </div>
      </div>

      {/* TABS */}
      <div className="border-b border-l-neutral-50 text-center mb-4">
        <div className="file-activity-tabs-inner-container">
          <div className="border-b border-blue-60 text-neutral-700 w-1/2 py-3">Info</div>
        </div>
      </div>

      {/* INFO TAB CONTENT */}
      <div className="relative border-l border-dashed border-l-neutral-50 pl-4">
        <div className="w-4 absolute bg-white -left-2 text-neutral-500">
          <UilFolderNetwork className="w-full" />
        </div>

        {featuresList}
      </div>
    </div>
  );

  return template;
};

export default DriveItemInfoMenu;
