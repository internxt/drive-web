import PictureAvatar from '../PictureAvatar';
import DefaultAvatar from '../DefaultAvatar';

export default function Avatar({
  src,
  diameter,
  className = '',
  fullName,
  style = {},
}: {
  src: string | null;
  fullName: string;
  diameter: number;
  className?: string;
  style?: Record<string, string | number>;
}): JSX.Element {
  return src ? (
    <PictureAvatar src={src} diameter={diameter} className={className} style={style} />
  ) : (
    <DefaultAvatar diameter={diameter} className={className} fullName={fullName} />
  );
}
