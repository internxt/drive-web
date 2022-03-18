import Empty from './Empty';
import Toolbar from './Toolbar';

export default function PhotosView({ className = '' }: { className?: string }) {
  return (
    <div className={`${className} w-full px-5 pt-2`}>
      <Toolbar onDeleteClick={console.log} onDownloadClick={console.log} onShareClick={console.log} />
    </div>
  );
}
