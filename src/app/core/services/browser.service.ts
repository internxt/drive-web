import { detect } from 'detect-browser';

function getName(): string | undefined {
  console.log(detect()?.name);
  return detect()?.name;
}

function isFirefox(): boolean {
  return getName() === 'firefox';
}

function isBrave(): boolean {
  const maybeBrave = (window.navigator as { brave?: { isBrave?: { name: 'isBrave' } } }).brave;

  return maybeBrave != undefined && maybeBrave?.isBrave?.name == 'isBrave';
}

export default {
  getName,
  isFirefox,
  isBrave
};
