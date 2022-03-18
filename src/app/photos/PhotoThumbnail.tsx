export default function PhotoThumbnail({ className = '', src }: { className?: string; src?: string }) {
  return (
    <div className={`${className}`} style={{ aspectRatio: '1/1' }}>
      {src ? <img src={src} /> : <div className="h-full w-full bg-gray-5" />}
    </div>
  );
}
