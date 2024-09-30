export type FileExtensionMap = Record<string, string[]>;
export interface VideoExtensions {
  webm: 'webm';
  mkv: 'mkv';
  vob: 'vob';
  ogg: 'ogg';
  drc: 'drc';
  avi: 'avi';
  mts: 'mts';
  m2ts: 'm2ts';
  mov: 'mov';
  qt: 'qt';
  wmv: 'wmv';
  yuv: 'yuv';
  rm: 'rm';
  rmvb: 'rmvb';
  viv: 'viv';
  asf: 'asf';
  amv: 'amv';
  mp4: 'mp4';
  m4p: 'm4p';
  mpg: 'mpg';
  mp2: 'mp2';
  mpeg: 'mpeg';
  mpe: 'mpe';
  mpv: 'mpv';
  m2v: 'm2v';
  m4v: 'm4v';
  svi: 'svi';
  '3gp': '3gp';
  '3g2': '3g2';
  mxf: 'mxf';
  roq: 'roq';
  msv: 'msv';
  flv: 'flv';
  f4v: 'f4v';
  f4p: 'f4p';
  f4a: 'f4a';
  f4b: 'f4b';
}

export interface AudioExtensions {
  '3gp': ['3gp'];
  aa: ['aa'];
  aac: ['aac'];
  aax: ['aax'];
  act: ['act'];
  aiff: ['aiff'];
  alac: ['alac'];
  amr: ['amr'];
  ape: ['ape'];
  au: ['au'];
  awd: ['awd'];
  dss: ['dss'];
  dvf: ['dvf'];
  flac: ['flac'];
  gsm: ['gsm'];
  iklax: ['iklax'];
  ivs: ['ivs'];
  m4a: ['m4a'];
  m4b: ['m4b'];
  m4p: ['m4p'];
  mmf: ['mmf'];
  mp3: ['mp3'];
  mpc: ['mpc'];
  msv: ['msv'];
  nmf: ['nmf'];
  ogg: ['ogg', 'oga', 'mogg'];
  opus: ['opus'];
  ra: ['ra', 'rm'];
  rf64: ['rf64'];
  sln: ['sln'];
  tta: ['tta'];
  voc: ['voc'];
  vox: ['vox'];
  wav: ['wav'];
  wma: ['wma'];
  wv: ['wv'];
  webm: ['webm'];
  '8svx': ['8svx'];
  cda: ['cda'];
}

export const audioExtensions: FileExtensionMap = {
  '3gp': ['3gp'],
  aa: ['aa'],
  aac: ['aac'],
  aax: ['aax'],
  act: ['act'],
  aiff: ['aiff'],
  alac: ['alac'],
  amr: ['amr'],
  ape: ['ape'],
  au: ['au'],
  awd: ['awd'],
  dss: ['dss'],
  dvf: ['dvf'],
  flac: ['flac'],
  gsm: ['gsm'],
  iklax: ['iklax'],
  ivs: ['ivs'],
  m4a: ['m4a'],
  m4b: ['m4b'],
  m4p: ['m4p'],
  mmf: ['mmf'],
  mp3: ['mp3'],
  mpc: ['mpc'],
  msv: ['msv'],
  nmf: ['nmf'],
  ogg: ['ogg', 'oga', 'mogg'],
  opus: ['opus'],
  ra: ['ra', 'rm'],
  rf64: ['rf64'],
  sln: ['sln'],
  tta: ['tta'],
  voc: ['voc'],
  vox: ['vox'],
  wav: ['wav'],
  wma: ['wma'],
  wv: ['wv'],
  weba: ['weba'],
  '8svx': ['8svx'],
  cda: ['cda'],
};

const codeExtensions: FileExtensionMap = {
  c: ['c', 'h'],
  'c++': ['cpp', 'c++', 'cc', 'cxx', 'hpp', 'h++', 'hh', 'hxx'],
  cobol: ['cob', 'cpy'],
  'c#': ['cs'],
  cmake: ['cmake'],
  coffee: ['coffee'],
  css: ['css'],
  less: ['less'],
  sass: ['sass'],
  scss: ['scss'],
  fortran: ['f', 'for', 'f77', 'f90'],
  'asp.net': ['aspx'],
  html: ['html', 'hmn'],
  java: ['java'],
  jsp: ['jsp'],
  javascript: ['js'],
  typescript: ['ts'],
  json: ['json'],
  jsx: ['jsx'],
  kotlin: ['kt'],
  mathematica: ['m', 'nb'],
  php: ['php', 'php3', 'php4', 'php5', 'phtml'],
  python: ['BUILD', 'bzl', 'py', 'pyw'],
  ruby: ['rb'],
  sql: ['sql'],
  vue: ['vue'],
  yaml: ['yaml', 'yml'],
};

const figmaExtensions: FileExtensionMap = {
  fig: ['fig'],
};

const imageExtensions: FileExtensionMap = {
  tiff: ['tif', 'tiff'],
  bmp: ['bmp'],
  heic: ['heic'],
  jpg: ['jpg', 'jpeg'],
  gif: ['gif'],
  png: ['png'],
  eps: ['eps'],
  raw: ['raw', 'cr2', 'nef', 'orf', 'sr2'],
  webp: ['webp'],
};
const previewableImageExtensionGroups: string[] = ['jpg', 'png', 'bmp', 'gif', 'webp', 'heic'];

const pdfExtensions: FileExtensionMap = {
  pdf: ['pdf'],
};

const pptExtensions: FileExtensionMap = {
  ppt: ['ppt', 'pptx', 'pptm'],
};

const txtExtensions: FileExtensionMap = {
  txt: ['txt', 'text', 'conf', 'def', 'list', 'log', 'md', 'lock'],
};

export const videoExtensions: FileExtensionMap = {
  webm: ['webm'],
  mkv: ['mkv'],
  vob: ['vob'],
  ogg: ['ogv', 'ogg'],
  drc: ['drc'],
  avi: ['avi'],
  mts: ['mts', 'm2ts'],
  quicktime: ['mov', 'qt'],
  'windows-media-video': ['wmv'],
  raw: ['yuv'],
  'real-media': ['rm', 'rmvb'],
  'vivo-active': ['viv'],
  asf: ['asf'],
  amv: ['amv'],
  'mpeg-4': ['mp4', 'm4p', 'm4v'],
  'mpeg-1': ['mpg', 'mp2', 'mpeg', 'mpe', 'mpv'],
  'mpeg-2': ['mpg', 'mpeg', 'm2v'],
  m4v: ['m4v'],
  svi: ['svi'],
  '3gpp': ['3gp'],
  '3gpp2': ['3g2'],
  mxf: ['mxf'],
  roq: ['roq'],
  nsv: ['nsv'],
  flv: ['flv', 'f4v', 'f4p', 'f4a', 'f4b'],
};

const excludeUnsupportedVideoExtensions: string[] = [
  'mkv',
  'vob',
  'ogv',
  'ogg',
  'drc',
  'avi',
  'mts',
  'm2ts',
  'qt',
  'wmv',
  'yuv',
  'rm',
  'rmvb',
  'viv',
  'asf',
  'amv',
  'm4p',
  'mpg',
  'mp2',
  'mpe',
  'mpv',
  'mpeg',
  'm2v',
  'svi',
  '3g2',
  'mxf',
  'roq',
  'nsv',
  'flv',
  'f4p',
  'f4a',
  'f4b',
];

const previewVideoExtensionsGroup: string[] = Object.keys(videoExtensions).filter(
  (extension) => !excludeUnsupportedVideoExtensions.includes(extension),
);

const excludeUnsupportedAudioExtensions: string[] = [
  'aa',
  'aax',
  'act',
  'aiff',
  'alac',
  'amr',
  'ape',
  'au',
  'awd',
  'dss',
  '3gp',
  'dvf',
  'gsm',
  'iklax',
  'ivs',
  'm4b',
  'm4p',
  'mmf',
  'mpc',
  'msv',
  'nmf',
  'mogg',
  'ra',
  'rm',
  'rf64',
  'sln',
  'tta',
  'voc',
  'vox',
  'wma',
  'wv',
  '8svx',
  'cda',
];

const previewAudioExtensionsGroup: string[] = Object.values(audioExtensions)
  .flatMap((extensions) => extensions.flat())
  .filter((extension) => !excludeUnsupportedAudioExtensions.includes(extension));

const WordExtensions: FileExtensionMap = {
  doc: ['doc'],
  docx: ['docx'],
};

const xlsExtensions: FileExtensionMap = {
  xls: ['xls'],
  xlsx: ['xlsx'],
};

const xmlExtensions: FileExtensionMap = {
  xml: ['xml', 'xsl', 'xsd'],
  svg: ['svg'],
};

const csvExtensions: FileExtensionMap = {
  csv: ['csv'],
};

const zipExtensions: FileExtensionMap = {
  zip: ['zip', 'zipx'],
};

const previewablePdfExtensionGroups: string[] = ['pdf'];

const previewExcelFormatExtensionGroup: string[] = ['xlsx'];

const previewDocsGroup: string[] = ['doc', 'docx'];

const defaultExtensions: FileExtensionMap = {};

export enum FileExtensionGroup {
  Audio,
  Code,
  Figma,
  Image,
  Pdf,
  Ppt,
  Txt,
  Video,
  Word,
  Xls,
  Xml,
  Csv,
  Zip,
  Default,
}

type fileExtensionsDictionary = Record<FileExtensionGroup, FileExtensionMap>;
type fileExtensionsPreviewableDictionary = {
  [key in FileExtensionGroup]: string[];
};

const fileExtensionGroups: fileExtensionsDictionary = {
  [FileExtensionGroup.Audio]: audioExtensions,
  [FileExtensionGroup.Code]: codeExtensions,
  [FileExtensionGroup.Figma]: figmaExtensions,
  [FileExtensionGroup.Image]: imageExtensions,
  [FileExtensionGroup.Pdf]: pdfExtensions,
  [FileExtensionGroup.Ppt]: pptExtensions,
  [FileExtensionGroup.Txt]: txtExtensions,
  [FileExtensionGroup.Video]: videoExtensions,
  [FileExtensionGroup.Word]: WordExtensions,
  [FileExtensionGroup.Xls]: xlsExtensions,
  [FileExtensionGroup.Xml]: xmlExtensions,
  [FileExtensionGroup.Csv]: csvExtensions,
  [FileExtensionGroup.Zip]: zipExtensions,
  [FileExtensionGroup.Default]: defaultExtensions,
};

export const fileExtensionPreviewableGroups: fileExtensionsPreviewableDictionary = {
  [FileExtensionGroup.Audio]: previewAudioExtensionsGroup,
  [FileExtensionGroup.Code]: [],
  [FileExtensionGroup.Figma]: [],
  [FileExtensionGroup.Image]: previewableImageExtensionGroups,
  [FileExtensionGroup.Pdf]: previewablePdfExtensionGroups,
  [FileExtensionGroup.Ppt]: [],
  [FileExtensionGroup.Txt]: [],
  [FileExtensionGroup.Video]: previewVideoExtensionsGroup,
  [FileExtensionGroup.Word]: previewDocsGroup,
  [FileExtensionGroup.Xls]: previewExcelFormatExtensionGroup,
  [FileExtensionGroup.Xml]: [],
  [FileExtensionGroup.Csv]: [],
  [FileExtensionGroup.Zip]: [],
  [FileExtensionGroup.Default]: [],
};

export const thumbnailableImageExtension: string[] = [
  ...imageExtensions['jpg'],
  ...imageExtensions['png'],
  ...imageExtensions['bmp'],
  ...imageExtensions['gif'],
];

export const thumbnailablePdfExtension: string[] = pdfExtensions['pdf'];

export const thumbnailableExtension: string[] = [...thumbnailableImageExtension, ...thumbnailablePdfExtension];

export default fileExtensionGroups;
