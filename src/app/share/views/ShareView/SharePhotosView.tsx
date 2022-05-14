import { useState, useEffect } from 'react';
import streamSaver from 'streamsaver';
import { match } from 'react-router';
import iconService from 'app/drive/services/icon.service';
import sizeService from 'app/drive/services/size.service';
import { TaskProgress } from 'app/tasks/types';
import i18n from 'app/i18n/services/i18n.service';
import { Link } from 'react-router-dom';
import { useAppSelector } from '../../../store/hooks';
import UilCheck from '@iconscout/react-unicons/icons/uil-check';
import UilArrowRight from '@iconscout/react-unicons/icons/uil-arrow-right';
import UilImport from '@iconscout/react-unicons/icons/uil-import';
import './ShareView.scss';
import errorService from 'app/core/services/error.service';
import Spinner from '../../../shared/components/Spinner/Spinner';
import { GetPhotoShareResponse, PhotoId } from '@internxt/sdk/dist/photos';
import { SdkFactory } from '../../../core/factory/sdk';
import network from 'app/network';
import downloadService from '../../../drive/services/download.service';
import JSZip from 'jszip';
import { Readable } from 'stream';
import { loadWritableStreamPonyfill } from 'app/network/download';
import { binaryStreamToBlob } from 'app/core/services/stream.service';

interface SharePhotosProps {
  match: match<{
    token: string;
    code: string;
  }>;
}

const SharePhotosView = (props: SharePhotosProps): JSX.Element => {
  const { token, code } = props.match.params;

  const [progress, setProgress] = useState(TaskProgress.Min);
  const [isDownloading, setIsDownloading] = useState(false);
  const [info, setInfo] = useState<GetPhotoShareResponse | null>(null);
  const [isError, setIsError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const isAuthenticated = useAppSelector((state) => state.user.isAuthenticated);

  let body, downloadButton;

  useEffect(() => {
    loadInfo()
      .then(setInfo)
      .catch((err) => {
        setIsError(true);
        setErrorMessage(errorService.castError(err).message);
      });
  }, []);

  const loadInfo = async (): Promise<GetPhotoShareResponse> => {
    // ! iOS Chrome is not supported
    if (navigator.userAgent.match('CriOS')) {
      throw new Error('Chrome iOS not supported. Use Safari to proceed');
    }

    const { shares } = await SdkFactory.getInstance().createPhotosClient();

    return shares.getShare(token, code).catch(() => {
      /**
       * TODO: Check that the server returns proper error message instead
       * of assuming that everything means that the link has expired
       */
      throw new Error(i18n.get('error.linkExpired'));
    });
  };

  const updateProgress = (progress: number) => {
    setProgress(Number((progress * 100).toFixed(2)));
  };

  const download = async (): Promise<void> => {
    setIsDownloading(true);
    const fileToken = info?.token;
    try {
      if (info?.photos.length === 1) {
        const [photo] = info.photos;
        const readablePromise = network.downloadFile({
          bucketId: info.bucket,
          fileId: photo.fileId,
          encryptionKey: Buffer.from(photo.decryptionKey, 'hex'),
          token: fileToken,
          options: {
            notifyProgress: updateProgress
          }
        });
        const fileBlob = await binaryStreamToBlob(await readablePromise);

        downloadService.downloadFileFromBlob(fileBlob, `${photo.name}.${photo.type}`);
      } else if (info && info.photos.length > 1) {
        const isBrave = !!(navigator.brave && (await navigator.brave.isBrave()));

        if (isBrave) {
          throw new Error(i18n.get('error.browserNotSupported', { userAgent: 'Brave' }));
        }
        const canUseReadableStreamMethod =
          'WritableStream' in window &&
          'ReadableStream' in window &&
          new ReadableStream().pipeTo !== undefined &&
          new ReadableStream().pipeThrough !== undefined &&
          WritableStream !== undefined;

        if (!canUseReadableStreamMethod) {
          await loadWritableStreamPonyfill();
        }

        const zip = new JSZip();

        const writableStream = streamSaver.createWriteStream('photos.zip', {});
        const writer = writableStream.getWriter();

        const generalProgress: Record<PhotoId, number> = {};

        const updateTaskProgress = () => {
          const totalSize = info.photos.reduce((prev, current) => prev + current.size, 0);
          const currentSize = info.photos.reduce(
            (prev, current) => prev + current.size * (generalProgress[current.fileId] ?? 0),
            0,
          );

          updateProgress(currentSize / totalSize);
        };

        for (const photo of info.photos) {
          const photoName = `${photo.name}.${photo.type}`;
          const photoStreamPromise = network.downloadFile({
            bucketId: info.bucket,
            fileId: photo.fileId,
            encryptionKey: Buffer.from(photo.decryptionKey, 'hex'),
            token: fileToken, 
            options: {
              notifyProgress: (progress) => {
                generalProgress[photo.fileId] = progress;
                updateTaskProgress();
              }
            }
          });

          zip.file(photoName, await photoStreamPromise, { compression: 'DEFLATE' });
        }
        await new Promise<void>((resolve, reject) => {
          const zipStream = zip.generateInternalStream({
            type: 'uint8array',
            streamFiles: true,
            compression: 'DEFLATE',
          }) as Readable;
          zipStream
            ?.on('data', (chunk: Buffer) => {
              writer.write(chunk);
            })
            .on('end', () => {
              writer.close();
              resolve();
            })
            .on('error', (err) => {
              reject(err);
            });
          zipStream.resume();
        });
      }
    } catch (err) {
      setIsError(true);
      setErrorMessage(errorService.castError(err).message);
      setIsDownloading(false);
    }
  };

  const handleLeavePage = (e) => {
    const confirmationMessage = '';

    e.returnValue = confirmationMessage; //Trident, Chrome 34+
    return confirmationMessage; // WebKit, Chrome <34
  };

  useEffect(() => {
    if (isDownloading && progress < 100) {
      window.addEventListener('beforeunload', handleLeavePage);

      return () => window.removeEventListener('beforeunload', handleLeavePage);
    }
  }, [progress]);

  if (!isDownloading) {
    downloadButton = (
      <>
        <UilImport height="20" width="20" />
        <span className="font-medium">{i18n.get('actions.download')}</span>
      </>
    );
  } else {
    downloadButton =
      progress < 100 ? (
        <>
          <div className="mr-1 h-5 w-5 text-white">
            <Spinner />
          </div>
          <span>{i18n.get('actions.downloading')}</span>
          {<span className="font-normal text-blue-20">{progress}%</span>}
        </>
      ) : (
        <>
          <UilCheck height="24" width="24" />
          <span className="font-medium">{i18n.get('actions.downloaded')}</span>
        </>
      );
  }

  if (isError) {
    const ItemIconComponent = iconService.getItemIcon(false, 'default');

    body = (
      <>
        <div className="relative h-32 w-32">
          <ItemIconComponent className="absolute -top-2.5 left-7 rotate-10 transform drop-shadow-soft filter" />
          <ItemIconComponent className="absolute top-0.5 -left-7 rotate-10- transform drop-shadow-soft filter" />
        </div>

        <div className="flex flex-col items-center justify-center">
          <span className="text-2xl font-semibold">Shared photos no longer available</span>
          <span className="text-cool-gray-60">{errorMessage}</span>
        </div>

        {isAuthenticated && (
          <Link to="/app" className="cursor-pointer text-cool-gray-90 no-underline hover:text-cool-gray-90">
            <div
              className="flex h-10 flex-row items-center justify-center space-x-2 rounded-lg bg-cool-gray-10
                          px-6 font-medium"
            >
              <span>Open Internxt Drive</span>
              <UilArrowRight height="20" width="20" />
            </div>
          </Link>
        )}
      </>
    );
  } else if (info) {
    const FileIcon = info.photos.length > 1 ? ImagesIcon : iconService.getItemIcon(false, 'png');
    const title =
      info.photos.length === 1 ? `${info.photos[0].name}.${info.photos[0].type}` : `${info.photos.length} photos`;
    const size = info.photos.reduce((prev, current) => prev + current.size, 0);

    body = (
      <>
        {/* File info */}
        <div className="flex flex-grow-0 flex-col items-center justify-center space-y-4">
          <div className="h-32 w-32 drop-shadow-soft filter">
            <FileIcon />
          </div>

          <div className="flex flex-col items-center justify-center space-y-2">
            <div className="flex flex-col items-center justify-center text-center font-medium">
              <abbr className="w-screen max-w-prose break-words px-10 text-xl sm:w-full" title={title}>
                {title}
              </abbr>
              <span className="text-cool-gray-60">{sizeService.bytesToString(size)}</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-row items-center justify-center space-x-3">
          <button
            onClick={download}
            className={`flex h-10 cursor-pointer flex-row items-center space-x-2 rounded-lg px-6 font-medium
                        text-white ${progress && !(progress < 100) ? 'bg-green-40' : 'bg-blue-60'}`}
          >
            {downloadButton}
          </button>
        </div>
      </>
    );
  } else {
    body = (
      <div className="h-8 w-8 text-cool-gray-30">
        <Spinner />
      </div>
    );
  }
  return body;
};

function ImagesIcon() {
  const Icon = iconService.getItemIcon(false, 'png');
  return (
    <div className="relative h-32 w-32">
      <Icon className="absolute -top-2.5 left-7 rotate-10 transform drop-shadow-soft filter" />
      <Icon className="absolute top-0.5 -left-7 rotate-10- transform drop-shadow-soft filter" />
    </div>
  );
}

export default SharePhotosView;
