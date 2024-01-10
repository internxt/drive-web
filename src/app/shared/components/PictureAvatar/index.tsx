export default function PictureAvatar({
  src,
  diameter,
  className = '',
  style = {},
}: {
  src: string;
  diameter: number;
  className?: string;
  style?: Record<string, string | number>;
}): JSX.Element {
  return (
    <img
      style={{ width: diameter, height: diameter, ...style }}
      className={`${className} shrink-0 select-none rounded-full object-cover`}
      src={src}
      draggable={false}
    />
  );
}
