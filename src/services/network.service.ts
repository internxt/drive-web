export const checkConnectionToCloud = (): Promise<boolean> => {
  const urlToTest = 'https://drive.internxt.com';
  let request = new XMLHttpRequest();

  return new Promise((resolve, reject) => {
    request.onload = () => {
      resolve(true);
    };
    request.onerror = () => {
      reject(false);
    };
    request.open('GET', urlToTest, true);
    request.send();
  });
};
