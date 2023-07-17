import { useEffect } from 'react';
import { DriveFileData } from '@internxt/sdk/dist/drive/storage/types';

import { loadVideoIntoPlayer } from 'app/core/services/media.service';
import { getEnvironmentConfig } from 'app/drive/services/network.service';
import { VideoExtensions } from 'app/drive/types/file-types';

const FileVideoViewer = ({ file }: { file: DriveFileData }) => {
  const { bridgeUser, bridgePass, encryptionKey } = getEnvironmentConfig(false);

  useEffect(() => {
    const videoId = 'video-Inxt';
    const video = document.getElementById(videoId) as HTMLVideoElement;

    loadVideoIntoPlayer(
      video,
      {
        bucketId: file.bucket,
        fileId: file.fileId,
        creds: {
          pass: bridgePass,
          user: bridgeUser,
        },
        mnemonic: encryptionKey,
        options: {
          notifyProgress: (totalBytes, downloadedBytes) => {
            // setUpdateProgress(downloadedBytes / totalBytes);
          },
          // abortController,
        },
      },
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
