import { useState } from 'react';
import Empty from './Empty';
import PhotoThumbnail from './PhotoThumbnail';
import Toolbar from './Toolbar';

export default function PhotosView({ className = '' }: { className?: string }) {
  const [selected, setSelected] = useState<number[]>([]);

  return (
    <div className={`${className} h-full w-full overflow-y-auto px-5 pt-2`}>
      <Toolbar onDeleteClick={console.log} onDownloadClick={console.log} onShareClick={console.log} />
      <div className="mt-2 grid gap-1" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))' }}>
        {Array(200)
          .fill(0)
          .map((_, i) => {
            const isSelected = selected.some((el) => i === el);

            return (
              <PhotoThumbnail
                onClick={() => console.log('clicked')}
                onSelect={() => setSelected(isSelected ? selected.filter((el) => el !== i) : selected.concat(i))}
                selected={isSelected}
                key={i}
              />
            );
          })}
      </div>
    </div>
  );
}
