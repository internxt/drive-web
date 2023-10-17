import { useEffect, useRef } from 'react';
import { DriveFileData } from '@internxt/sdk/dist/drive/storage/types';

import { loadAudioIntoPlayer } from 'app/core/services/media.service';
import { AudioExtensions } from 'app/drive/types/file-types';

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
    const audioPlayer = audioRef.current;

    if (audioPlayer) {
      loadAudioIntoPlayer(audioPlayer, blob, file.type as keyof AudioExtensions).catch((err) => {
        console.error('Error loading audio into player', err);
        setIsPreviewAvailable(false);
      });
    }
  }, []);

  return (
    <div>
      <audio ref={audioRef} controls></audio>
    </div>
  );
};

export default FileAudioViewer;
