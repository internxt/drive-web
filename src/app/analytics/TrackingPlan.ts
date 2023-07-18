// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace TrackingPlan {
  export interface DownloadProperties {
    file_download_id: string;
    file_id: number;
    file_size: number;
    file_extension: string;
    file_name: string;
    parent_folder_id: number;
    file_download_method_supported: string;
  }

  export interface DownloadErrorProperties extends DownloadProperties {
    error_message: string;
  }

  export interface UploadProperties {
    file_upload_id: string;
    file_size: number;
    file_extension: string;
    parent_folder_id: number;
    file_name: string;
  }

  export interface UploadCompletedProperties extends UploadProperties {
    bucket_id: number;
    file_id: number;
  }

  export interface UploadErrorProperties extends UploadProperties {
    bucket_id: number;
    error_message: string;
  }

  export interface UploadCompletedProperties extends UploadProperties {
    bucket_id: number;
    file_id: number;
  }

  export interface UploadAbortedProperties extends UploadProperties {
    bucket_id: number;
  }

  export interface CanceledSubscriptionProperties {
    feedback: string;
  }

  export enum EventNames {
    FileUploadStart = 'File Upload Started',
    FileUploadError = 'File Upload Error',
    FileUploadCompleted = 'File Upload Completed',
    FileUploadAborted = 'File Upload Aborted',
    FileDownloadCompleted = 'File Download Completed',
    FileDownloadError = 'File Download Error',
    FileDownloadStarted = 'File Download Started',
    FileDownloadAborted = 'File Download Aborted',
    CanceledSubscription = 'Subscription Canceled',
  }
}
