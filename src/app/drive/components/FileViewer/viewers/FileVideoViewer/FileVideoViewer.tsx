import { useEffect } from 'react';
import { DriveFileData } from '@internxt/sdk/dist/drive/storage/types';

import { loadVideoIntoPlayer } from 'app/core/services/media.service';
import { VideoExtensions } from 'app/drive/types/file-types';

const FileVideoViewer = ({ file, blob }: { file: DriveFileData, blob: Blob }): JSX.Element => {
  useEffect(() => {
    const videoId = 'video-Inxt';
    const video = document.getElementById(videoId) as HTMLVideoElement;

    loadVideoIntoPlayer(
      video,
      blob,
      file.type as keyof VideoExtensions,
    )
      .then((meta) => {
        //TODO: Handle it.
        console.log('Video meta', meta);
      })
      .catch((err) => {
        // TODO: Handle it.
      });
  }, []);

  return (
    <div>
      <video id="video-Inxt" controls></video>
    </div>
  );
};

export default FileVideoViewer;
