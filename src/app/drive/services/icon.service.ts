import { FunctionComponent, SVGProps } from 'react';

import { FileExtensionGroup } from '../types/file-types';

import { ReactComponent as LightFolder } from '../../../assets/icons/light/folder.svg';
import { ReactComponent as DefaultFile } from '../../../assets/icons/file-types/default.svg';
import { ReactComponent as AudioFile } from '../../../assets/icons/file-types/audio.svg';
import { ReactComponent as CodeFile } from '../../../assets/icons/file-types/code.svg';
import { ReactComponent as FigmaFile } from '../../../assets/icons/file-types/figma.svg';
import { ReactComponent as ImageFile } from '../../../assets/icons/file-types/image.svg';
import { ReactComponent as PdfFile } from '../../../assets/icons/file-types/pdf.svg';
import { ReactComponent as PptFile } from '../../../assets/icons/file-types/ppt.svg';
import { ReactComponent as TxtFile } from '../../../assets/icons/file-types/txt.svg';
import { ReactComponent as VideoFile } from '../../../assets/icons/file-types/video.svg';
import { ReactComponent as WordFile } from '../../../assets/icons/file-types/word.svg';
import { ReactComponent as XlsFile } from '../../../assets/icons/file-types/excel.svg';
import { ReactComponent as XmlFile } from '../../../assets/icons/file-types/code.svg';
import { ReactComponent as CsvFile } from '../../../assets/icons/file-types/csv.svg';
import { ReactComponent as ZipFile } from '../../../assets/icons/file-types/zip.svg';
import fileExtensionService from './file-extension.service';

const iconsByFileExtensionGroup = {
  [FileExtensionGroup.Audio]: AudioFile,
  [FileExtensionGroup.Code]: CodeFile,
  [FileExtensionGroup.Figma]: FigmaFile,
  [FileExtensionGroup.Image]: ImageFile,
  [FileExtensionGroup.Pdf]: PdfFile,
  [FileExtensionGroup.Ppt]: PptFile,
  [FileExtensionGroup.Txt]: TxtFile,
  [FileExtensionGroup.Video]: VideoFile,
  [FileExtensionGroup.Word]: WordFile,
  [FileExtensionGroup.Xls]: XlsFile,
  [FileExtensionGroup.Xml]: XmlFile,
  [FileExtensionGroup.Csv]: CsvFile,
  [FileExtensionGroup.Zip]: ZipFile,
  [FileExtensionGroup.Default]: DefaultFile,
};
const extensionsList = fileExtensionService.computeExtensionsLists();

export const icons = {
  AudioFile,
  CodeFile,
  FigmaFile,
  ImageFile,
  PdfFile,
  PptFile,
  TxtFile,
  VideoFile,
  WordFile,
  XlsFile,
  XmlFile,
  ZipFile,
  DefaultFile,
  LightFolder,
};

export const getItemIcon = (isFolder: boolean, itemExtension?: string): FunctionComponent<SVGProps<SVGSVGElement>> => {
  let groupId: FileExtensionGroup = FileExtensionGroup.Default;

  if (itemExtension) {
    Object.entries(extensionsList).every(([key, list]) => {
      const matched = list.includes(itemExtension.toLowerCase());

      if (matched) {
        groupId = FileExtensionGroup[key];
      }

      return !matched;
    });
  }

  return !isFolder ? iconsByFileExtensionGroup[groupId] : LightFolder;
};

const iconService = {
  getItemIcon,
};

export default iconService;
