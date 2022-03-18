import Empty from './Empty';

export default function PhotosView({ className = '' }: { className?: string }) {
  return (
    <div className={`${className} w-full`}>
      <Empty />
    </div>
  );
}
