import { useEffect, useRef } from 'react';
import { audioTypes } from 'services/media.service';
import { FileContentViewerProps } from '../types';

const FileAudioViewer = ({ file, blob, onError }: FileContentViewerProps): JSX.Element => {
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const audioPlayer = audioRef.current as HTMLAudioElement;
    if (!blob) return;

    audioPlayer.addEventListener('loadedmetadata', () => {
      audioPlayer.play().catch((err) => {
        const error = err as Error;
        console.error('[ERROR WHILE PLAYING AUDIO/STACK]: ', error.stack ?? error.message);
        onError();
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
