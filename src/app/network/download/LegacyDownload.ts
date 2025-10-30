import { buildProgressStream } from 'app/core/services/stream.service';
import { createDecipheriv, Decipher } from 'crypto';
import { generateFileKey } from '../crypto';
import { getDecryptedStream, IDownloadParams, NetworkCredentials } from '../download';
import { getFileInfoWithAuth, getFileInfoWithToken, getMirrors, Mirror } from '../requests';
import envService from 'app/core/services/env.service';
import {
  MissingAuthenticationError,
  MissingEncryptionKeyError,
  NoContentReceivedError,
} from '../errors/download.errors';

interface FileInfo {
  bucket: string;
  mimetype: string;
  filename: string;
  frame: string;
  size: number;
  id: string;
  created: Date;
  hmac: {
    value: string;
    type: string;
  };
  erasure?: {
    type: string;
  };
  index: string;
}

interface MetadataRequiredForDownload {
  mirrors: Mirror[];
  fileMeta: FileInfo;
}

export class LegacyDownload {
  downloadFile = async (params: IDownloadParams): Promise<ReadableStream<Uint8Array>> => {
    const { bucketId, fileId, token, creds } = params;

    let metadata: MetadataRequiredForDownload;

    if (creds) {
      metadata = await this.getRequiredFileMetadataWithAuth(bucketId, fileId, creds);
    } else if (token) {
      metadata = await this.getRequiredFileMetadataWithToken(bucketId, fileId, token);
    } else {
      throw new MissingAuthenticationError();
    }

    const { mirrors, fileMeta } = metadata;
    const downloadUrls: string[] = mirrors.map((m) => m.url);

    const index = Buffer.from(fileMeta.index, 'hex');
    const iv = index.slice(0, 16);
    let key: Buffer;

    if (params.encryptionKey) {
      key = params.encryptionKey;
    } else if (params.mnemonic) {
      key = await generateFileKey(params.mnemonic, bucketId, index);
    } else {
      throw new MissingEncryptionKeyError();
    }

    const downloadStream = await this.getFileDownloadStream(
      downloadUrls,
      createDecipheriv('aes-256-ctr', key, iv),
      params.options?.abortController,
    );

    return buildProgressStream(downloadStream, (readBytes) => {
      params.options?.notifyProgress(metadata.fileMeta.size, readBytes);
    });
  };

  private async getFileDownloadStream(
    downloadUrls: string[],
    decipher: Decipher,
    abortController?: AbortController,
  ): Promise<ReadableStream> {
    const encryptedContentParts: ReadableStream<Uint8Array>[] = [];

    for (const downloadUrl of downloadUrls) {
      const useProxy =
        envService.getVariable('dontUseProxy') !== 'true' && !new URL(downloadUrl).hostname.includes('internxt');
      const fetchUrl = (useProxy ? envService.getVariable('proxy') + '/' : '') + downloadUrl;
      const encryptedStream = await fetch(fetchUrl, { signal: abortController?.signal }).then((res) => {
        if (!res.body) {
          throw new NoContentReceivedError();
        }

        return res.body;
      });

      encryptedContentParts.push(encryptedStream);
    }

    return getDecryptedStream(encryptedContentParts, decipher);
  }

  async getRequiredFileMetadataWithToken(
    bucketId: string,
    fileId: string,
    token: string,
  ): Promise<MetadataRequiredForDownload> {
    const fileMeta: FileInfo = await getFileInfoWithToken(bucketId, fileId, token);
    const mirrors: Mirror[] = await getMirrors(bucketId, fileId, null, token);

    return { fileMeta, mirrors };
  }

  async getRequiredFileMetadataWithAuth(
    bucketId: string,
    fileId: string,
    creds: NetworkCredentials,
  ): Promise<MetadataRequiredForDownload> {
    const fileMeta: FileInfo = await getFileInfoWithAuth(bucketId, fileId, creds);
    const mirrors: Mirror[] = await getMirrors(bucketId, fileId, creds);

    return { fileMeta, mirrors };
  }
}

export const legacyDownload = new LegacyDownload();
