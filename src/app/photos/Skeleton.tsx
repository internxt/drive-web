import PhotoThumbnail from './PhotoThumbnail';

export default function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div
      className={`${className} mt-2 grid gap-1`}
      style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))' }}
    >
      {new Array(150).fill(0).map((_, i) => (
        <PhotoThumbnail selected key={i} />
      ))}
    </div>
  );
}
