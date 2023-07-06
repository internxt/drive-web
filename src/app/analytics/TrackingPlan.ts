// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace TrackingPlan {
  export interface DownloadProperties {
    file_size: number; // bytes
    file_extension: string;
    bandwidth: number;
    band_utilization: number;
    process_identifier: string;
    is_multiple: 0 | 1;
    file_id: number;
    file_name: string;
    parent_folder_id: number;
    file_download_method_supported?: string;
  }

  export interface UploadProperties {
    file_size: number;
    file_extension: string;
    bandwidth: number;
    band_utilization: number;
    process_identifier: string;
    file_upload_id?: string;
    is_multiple: 0 | 1;
    file_name?: string;
    parent_folder_id: number;
    is_brave: boolean;
  }

  interface DownloadProcess {
    file_size: number;
    file_extension: string;
    bandwidth: number;
    band_utilization: number;
    process_identifier: string;
    is_multiple: 0 | 1;
    file_id: number;
    file_name: string;
    parent_folder_id: number;
  }

  export type DownloadStartedProperties = DownloadProcess;

  export type DownloadCompletedProperties = DownloadProcess;

  export type DownloadAbortedProperties = DownloadProcess;

  export interface DownloadErrorProperties extends DownloadProcess {
    error_message_user: string;
    error_message: string;
    stack_trace: string;
  }

  export interface UploadCompletedProperties extends UploadProperties {
    bucket_id: number;
    file_id: number;
    is_brave: boolean;
  }

  export interface UploadErrorProperties extends UploadProperties {
    bucket_id: number;
    error_message_user: string;
    error_message: string;
    stack_trace: string;
    is_brave: boolean;
  }

  export interface UploadCompletedProperties extends UploadProperties {
    bucket_id: number;
    file_id: number;
    is_brave: boolean;
  }

  export interface UploadAbortedProperties extends UploadProperties {
    bucket_id: number;
    is_brave: boolean;
  }

  export interface CanceledSubscriptionProperties {
    feedback: string;
  }

  export enum EventNames {
    FileUploadStart = 'Upload Started',
    FileUploadError = 'Upload Error',
    FileUploadCompleted = 'Upload Completed',
    FileUploadAborted = 'Upload Aborted',
    FileDownloadCompleted = 'Download Completed',
    FileDownloadError = 'Download Error',
    FileDownloadStarted = 'Download Started',
    FileDownloadAborted = 'Download Aborted',
    CanceledSubscription = 'Subscription Canceled',
  }
}
