import { useEffect } from 'react';
import { DriveFileData } from '@internxt/sdk/dist/drive/storage/types';

import { loadAudioIntoPlayer } from 'app/core/services/media.service';
import { AudioExtensions } from 'app/drive/types/file-types';

const FileAudioViewer = ({
  file,
  blob,
  setIsErrorWhileDownloading,
}: {
  file: DriveFileData;
  blob: Blob;
  setIsErrorWhileDownloading: (isError: boolean) => void;
}): JSX.Element => {
  useEffect(() => {
    const audioId = 'audio-Inxt';
    const audioPlayer = document.getElementById(audioId) as HTMLVideoElement;

    loadAudioIntoPlayer(audioPlayer, blob, file.type as keyof AudioExtensions).catch((err) => {
      console.error('Error loading audio into player', err);
      setIsErrorWhileDownloading(true);
    });
  }, []);

  return (
    <div>
      <audio id="audio-Inxt" controls></audio>
    </div>
  );
};

export default FileAudioViewer;
