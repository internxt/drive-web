export default function PictureAvatar({
  src,
  diameter,
  className = '',
}: {
  src: string;
  diameter: number;
  className?: string;
}): JSX.Element {
  return (
    <img
      style={{ width: diameter, height: diameter }}
      className={`${className} shrink-0 select-none rounded-full`}
      src={src}
      draggable={false}
    />
  );
}
