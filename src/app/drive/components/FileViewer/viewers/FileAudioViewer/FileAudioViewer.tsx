import { useEffect } from 'react';
import { DriveFileData } from '@internxt/sdk/dist/drive/storage/types';

import { loadAudioIntoPlayer } from 'app/core/services/media.service';
import { VideoExtensions } from 'app/drive/types/file-types';

const FileAudioViewer = ({ file, blob }: { file: DriveFileData, blob: Blob }): JSX.Element => {
  useEffect(() => {
    const audioId = 'audio-Inxt';
    const audioPlayer = document.getElementById(audioId) as HTMLVideoElement;

    loadAudioIntoPlayer(
      audioPlayer,
      blob,
      file.type as keyof VideoExtensions,
    )
      .then((meta) => {
        console.log('Audio meta', meta);
      })
      .catch((err) => {
        // TODO: Handle it.
      });
  }, []);

  return (
    <div>
      <audio id="audio-Inxt" controls></audio>
    </div>
  );
};

export default FileAudioViewer;
