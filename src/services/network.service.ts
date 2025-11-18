import errorService from './error.service';

export const checkConnectionToCloud = (): Promise<boolean> => {
  const urlToTest = 'https://drive.internxt.com';
  const request = new XMLHttpRequest();

  return new Promise((resolve, reject) => {
    request.onload = () => {
      resolve(true);
    };
    request.onerror = (error) => {
      const connectionError = new Error('Failed to connect to cloud');
      errorService.reportError(error);
      reject(connectionError);
    };
    request.open('GET', urlToTest, true);
    request.send();
  });
};
