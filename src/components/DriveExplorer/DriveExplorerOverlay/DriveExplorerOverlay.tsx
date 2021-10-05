import './DriveExplorerOverlay.scss';

interface DriveExplorerOverlayProps {
  icon: JSX.Element;
  title: string;
  subtitle: string;
}

function DriveExplorerOverlay({ icon, title, subtitle }: DriveExplorerOverlayProps): JSX.Element {
  return (
    <div className="pointer-events-none p-8 absolute bg-white h-full w-full">
      <div className="h-full flex items-center justify-center rounded-12px">
        <div className="mb-28">
          <div className="file-explorer-overlay-icon-container flex m-auto bg-blue-10 rounded-1/2 mb-10">{icon}</div>
          <div className="text-center">
            <span className="font-semibold text-2xl text-neutral-500 block mb-2">{title}</span>
            <span className="text-base text-neutral-500 block">{subtitle}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DriveExplorerOverlay;
