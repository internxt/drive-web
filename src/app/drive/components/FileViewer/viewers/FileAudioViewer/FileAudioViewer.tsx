import { useEffect } from 'react';
import { DriveFileData } from '@internxt/sdk/dist/drive/storage/types';

import { loadAudioIntoPlayer } from 'app/core/services/media.service';
import { getEnvironmentConfig } from 'app/drive/services/network.service';
import { VideoExtensions } from 'app/drive/types/file-types';

const FileVideoViewer = ({ file }: { file: DriveFileData }) => {
  const { bridgeUser, bridgePass, encryptionKey } = getEnvironmentConfig(false);

  useEffect(() => {
    const audioId = 'audio-Inxt';
    const audioPlayer = document.getElementById(audioId) as HTMLVideoElement;

    loadAudioIntoPlayer(
      audioPlayer,
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

export default FileVideoViewer;
