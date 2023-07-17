import { binaryStreamToBlob } from './stream.service';
import { VideoExtensions } from '../../drive/types/file-types';

type VideoTypes = Record<keyof VideoExtensions, string>;

const videoTypes: Partial<VideoTypes> = {
  mp4: 'video/webm; codecs="vp8,vorbis"',
  webm: 'video/webm; codecs="vp8,vorbis"',
};

export function isTypeSupportedByVideoPlayer(type: keyof VideoExtensions): boolean {
  return Object.keys(videoTypes).includes(type);
}

export async function loadVideoIntoPlayer(
  videoPlayer: HTMLVideoElement,
  video: Blob,
  videoType: keyof VideoTypes,
): Promise<{
  metadata: {
    width: number;
    height: number;
  };
}> {
  const mediaSource = new MediaSource();
  const metadata = {
    width: 0,
    height: 0,
  };

  videoPlayer.addEventListener('onloadedmetadata', () => {
    metadata.width = videoPlayer.videoWidth;
    metadata.height = videoPlayer.videoHeight;
  });

  videoPlayer.src = URL.createObjectURL(mediaSource);

  return new Promise((resolve, reject) => {
    mediaSource.addEventListener('sourceopen', async () => {
      const type = videoTypes[videoType];

      if (!type) {
        return reject(`Unknown video type ${type}`);
      }
      const mime = `video/${videoType}`;
      const sourceBuffer = mediaSource.addSourceBuffer(type);
      // const blob = await binaryStreamToBlob(videoStream, mime);

      sourceBuffer.addEventListener('updateend', () => {
        mediaSource.endOfStream();

        resolve({
          metadata: {
            width: videoPlayer.videoWidth,
            height: videoPlayer.videoHeight,
          },
        });
      });

      sourceBuffer.addEventListener('error', reject);

      sourceBuffer.appendBuffer(await video.arrayBuffer());
    });
  });
}

export async function loadAudioIntoPlayer(
  audioPlayer: HTMLAudioElement,
  audio: Blob,
  // audioStream: ReadableStream<Uint8Array>,
  videoType: keyof VideoTypes,
): Promise<void> {
  const mime = `audio/${videoType}`;
  // const blob = await binaryStreamToBlob(audioStream, mime);

  audioPlayer.src = URL.createObjectURL(audio);
}
