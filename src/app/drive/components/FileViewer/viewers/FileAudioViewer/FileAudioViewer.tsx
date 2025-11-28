import { useEffect, useRef } from 'react';
import { DriveFileData } from '@internxt/sdk/dist/drive/storage/types';
import { audioTypes } from 'services/media.service';

const FileAudioViewer = ({
  file,
  blob,
  setIsPreviewAvailable,
}: {
  file: DriveFileData;
  blob: Blob;
  setIsPreviewAvailable: (isError: boolean) => void;
}): JSX.Element => {
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const audioPlayer = audioRef.current as HTMLAudioElement;

    audioPlayer.addEventListener('loadedmetadata', () => {
      audioPlayer.play().catch((err) => {
        const error = err as Error;
        console.error('[ERROR WHILE PLAYING AUDIO/STACK]: ', error.stack ?? error.message);
        setIsPreviewAvailable(false);
      });
    });

    const type: string = audioTypes[file.type] ?? `audio/${file.type}`;

    audioPlayer.src = URL.createObjectURL(new Blob([blob], { type }));

    // Cleanup
    return () => {
      URL.revokeObjectURL(audioPlayer.src);
    };
  }, []);

  return (
    <div>
      <audio ref={audioRef} controls></audio>
    </div>
  );
};

export default FileAudioViewer;
