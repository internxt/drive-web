import PhotoThumbnail from './PhotoThumbnail';

export default function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div
      className={`${className} grid gap-1 px-5`}
      style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))' }}
    >
      {new Array(150).fill(0).map((_, i) => (
        <PhotoThumbnail selected={false} key={i} />
      ))}
    </div>
  );
}
