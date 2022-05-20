import PictureAvatar from '../../PictureAvatar';
import DefaultAvatar from '../DefaultAvatar';

export default function Avatar({
  src,
  diameter,
  className = '',
  fullName,
}: {
  src: string | null;
  fullName: string;
  diameter: number;
  className?: string;
}): JSX.Element {
  return src ? (
    <PictureAvatar src={src} diameter={diameter} className={className} />
  ) : (
    <DefaultAvatar diameter={diameter} className={className} fullName={fullName} />
  );
}
