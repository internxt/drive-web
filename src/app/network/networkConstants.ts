export const BUCKET_META_MAGIC = [
  66, 150, 71, 16, 50, 114, 88, 160, 163, 35, 154, 65, 162, 213, 226, 215, 70, 138, 57, 61, 52, 19, 210, 170, 38, 164,
  162, 200, 86, 201, 2, 81,
];

export const MAX_TRIES = 3;
export const RETRY_DELAY = 1000;
export const MIN_MULTIPART_SIZE = 100 * 1024 * 1024;
export const UPLOAD_CHUNK_SIZE = 30 * 1024 * 1024;
export const ALLOWED_CHUNK_OVERHEAD = 64 * 1024;

export const FIFTY_MEGABYTES = 50 * 1024 * 1024;
export const TWENTY_MEGABYTES = 20 * 1024 * 1024;
export const USE_MULTIPART_THRESHOLD_BYTES = 50 * 1024 * 1024;
export const MAX_UPLOAD_ATTEMPTS = 2;
