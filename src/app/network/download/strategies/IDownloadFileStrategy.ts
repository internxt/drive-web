import { queue } from 'async';

import IndexedDbDownloadRepository from '../../../../app/repositories/IndexedDbDownloadRepository';

type DownloadPart = () => Promise<ArrayBuffer>;

export async function runDownload(
  getUrls: () => Promise<string[]>,
  size: number,
  range: number,
) {
  const urls = await getUrls();
  console.log('urls', urls);

  const ranges: { start: number, end: number, index: number }[] = [];
  const [urlsArr] = urls;

  for (let start = 0, i = 0; start < size; start += range, i++) {
    const end = Math.min(start + range - 1, size - 1);
    ranges.push({ start, end, index: i++ });
  }

  const concurrency = 6;
  const tenSecondsInMs = 10 * 1000;
  const downloadId = window.crypto.randomUUID();
  const indexedDbService = IndexedDbDownloadRepository.getInstance();

  try {
    const q = queue(async (task: { partNumber: number; downloadPart: DownloadPart }) => {
      const part = await task.downloadPart();
      console.log('storing blob size', part, 'downloadId', downloadId, 'part_number', task.partNumber);
      await indexedDbService.setDownloadPart(downloadId, task.partNumber, part);
    }, concurrency);

    q.error((err) => {
      // TODO: Requeue here
      console.log('queue err', err);
      q.kill();
    });

    for (const range of ranges) {
      q.push({
        partNumber: range.index,
        downloadPart: () =>
          retryableFetch(urlsArr[range.index], range, 5, tenSecondsInMs)
      });
    }

    await q.drain();
  } catch (err) {
    console.log('errror in mian funcion');
    console.error(err);
  }

  let currentIndex = 0;
  const partsCount = ranges.length;

  return new ReadableStream({
    async pull(controller) {
      if (currentIndex < partsCount) {
        console.log('reading part', currentIndex, 'from indexed db');
        const arrayBuffer = await indexedDbService.getDownloadPart(downloadId, currentIndex);

        console.log('read blob', arrayBuffer && arrayBuffer.byteLength, 'part', currentIndex, 'downloadId', downloadId);

        const uint8Array = new Uint8Array(arrayBuffer);

        controller.enqueue(uint8Array);

        currentIndex++;
      } else {
        controller.close();
      }
    }
  });
}

async function fetchWithTimeout(url: string, options: RequestInit, timeout: number): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    clearInterval(timeoutId);
    return response;
  } catch (error) {
    console.error((error as any).name, (error as any).message);
    if ((error as Error).message.includes('timed out')) {
      throw new Error('Fetch timed out');
    }
    throw error;
  }
}

async function retryableFetch(
  url: string,
  range: { start: number, end: number },
  retries: number,
  timeout: number
): Promise<ArrayBuffer> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log('attempt', attempt, 'for range', range.end);
      const res = await fetchWithTimeout(url, {
        headers: {
          Range: `bytes=${range.start}-${range.end}`,
        }
      }, timeout);

      const blob = await res.arrayBuffer();
      console.log('attempt', attempt, 'for range', range.end, 'finished!');

      return blob;
    } catch (error) {
      console.error(`Attempt ${attempt} failed: ${(error as Error).message}`);
      if (attempt === retries) {
        throw new Error('Max retries reached');
      }
    }
  }
  throw new Error('Failed to fetch');
}