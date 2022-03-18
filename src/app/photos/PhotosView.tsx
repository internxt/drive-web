import Empty from './Empty';
import PhotoThumbnail from './PhotoThumbnail';
import Toolbar from './Toolbar';

export default function PhotosView({ className = '' }: { className?: string }) {
  return (
    <div className={`${className} w-full px-5 pt-2`}>
      <Toolbar onDeleteClick={console.log} onDownloadClick={console.log} onShareClick={console.log} />
      <div className="mt-2 grid gap-1" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))' }}>
        {Array(200)
          .fill(0)
          .map((_, i) => (
            <PhotoThumbnail key={i} />
          ))}
      </div>
    </div>
  );
}
