import { FunctionComponent, SVGProps } from 'react';

import { FileExtensionGroup } from '../types/file-types';

import LightFolder from 'assets/icons/light/folder.svg?react';
import DefaultFile from 'assets/icons/file-types/default.svg?react';
import AudioFile from 'assets/icons/file-types/audio.svg?react';
import CodeFile from 'assets/icons/file-types/code.svg?react';
import FigmaFile from 'assets/icons/file-types/figma.svg?react';
import ImageFile from 'assets/icons/file-types/image.svg?react';
import PdfFile from 'assets/icons/file-types/pdf.svg?react';
import PptFile from 'assets/icons/file-types/ppt.svg?react';
import TxtFile from 'assets/icons/file-types/txt.svg?react';
import VideoFile from 'assets/icons/file-types/video.svg?react';
import WordFile from 'assets/icons/file-types/word.svg?react';
import XlsFile from 'assets/icons/file-types/excel.svg?react';
import CsvFile from 'assets/icons/file-types/csv.svg?react';
import ZipFile from 'assets/icons/file-types/zip.svg?react';
import fileExtensionService from './file-extension.service';
const XmlFile = CodeFile;

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

  return isFolder ? LightFolder : iconsByFileExtensionGroup[groupId];
};

const iconService = {
  getItemIcon,
};

export default iconService;
