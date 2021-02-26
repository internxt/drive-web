import React from 'react';

// Folder
import Folder from './Folders/Folder';
// Folder cover icons
import AvatarCircleNeutral from './Folder-cover-icons/AvatarCircleNeutral';
import Backup from './Folder-cover-icons/Backup';
import BarChart from './Folder-cover-icons/BarChart';
import Bell from './Folder-cover-icons/Bell';
import Binoculars from './Folder-cover-icons/Binoculars';
import Book from './Folder-cover-icons/Book';
import Bowl from './Folder-cover-icons/Bowl';
import Camera from './Folder-cover-icons/Camera';
import Categories from './Folder-cover-icons/Categories';
import CircleFilledCheckmark from './Folder-cover-icons/CircleFilledCheckmark';
import Clappboard from './Folder-cover-icons/Clappboard';
import Clipboard from './Folder-cover-icons/Clipboard';
import Cloud from './Folder-cover-icons/Cloud';
import ControllerNeoGeo from './Folder-cover-icons/ControllerNeoGeo';
import DollarSign from './Folder-cover-icons/DollarSign';
import FaceHappy from './Folder-cover-icons/FaceHappy';
import File from './Folder-cover-icons/File';
import HeartFilled from './Folder-cover-icons/HeartFilled';
import Inbox from './Folder-cover-icons/Inbox';
import LightOn from './Folder-cover-icons/LightOn';
import LockLocked from './Folder-cover-icons/LockLocked';
import MusicNote from './Folder-cover-icons/MusicNote';
import NavigationCircle from './Folder-cover-icons/NavigationCircle';
import Notifications from './Folder-cover-icons/Notifications';
import Path from './Folder-cover-icons/Path';
import Running from './Folder-cover-icons/Running';
import StarFilled from './Folder-cover-icons/StarFilled';
import Video from './Folder-cover-icons/Video';
import Window from './Folder-cover-icons/Window';
import YinYang from './Folder-cover-icons/YinYang';
// Dashboard icons
import Account from './Dashboard-Icons/Account';
import AddFolder from './Dashboard-Icons/Add-folder';
import BackArrow from './Dashboard-Icons/back-arrow';
import CancelFileUpload from './Dashboard-Icons/Cancel file upload';
import CloseShareFileFolderTab from './Dashboard-Icons/Close Share file_folder tab';
import CloseTab from './Dashboard-Icons/Close tab';
import ColourSelectedTick from './Dashboard-Icons/Colour selected tick';
import Copy from './Dashboard-Icons/Copy';
import Delete from './Dashboard-Icons/Delete';
import Download from './Dashboard-Icons/Download';
import DropdownArrow from './Dashboard-Icons/Dropdown arrow';
import Info from './Dashboard-Icons/Info';
import InfoOn from './Dashboard-Icons/InfoOn';
import NextPageArrow from './Dashboard-Icons/Next page arrow';
import Repeat from './Dashboard-Icons/Repeat';
import Search from './Dashboard-Icons/Search';
import Share from './Dashboard-Icons/Share';
import Upload from './Dashboard-Icons/Upload';
import Uploading from './Dashboard-Icons/Uploading';

const defaultColors = {
  'blue'      :   '#688DC4',
  'green'     :   '#6FA348',
  'grey'      :   '#999',
  'pink'      :   '#CF699F',
  'purple'    :   '#9C69C9',
  'red'       :   '#C96969',
  'yellow'    :   '#D4AB63'
};

interface IconProps {
    name: string
}

class Icon extends React.Component<IconProps> {

  determineIcon(iconName: string) {
    switch (iconName) {
    // Folder icon
      case 'folder':
        return <Folder defaultColors={defaultColors} {...this.props} />;
      // Folder cover icons
      case 'avatarcircleneutral':
        return <AvatarCircleNeutral defaultColors={defaultColors} {...this.props} />;
      case 'backup':
        return <Backup defaultColors={defaultColors} {...this.props} />;
      case 'barchart':
        return <BarChart defaultColors={defaultColors} {...this.props} />;
      case 'bell':
        return <Bell defaultColors={defaultColors} {...this.props} />;
      case 'binoculars':
        return <Binoculars defaultColors={defaultColors} {...this.props} />;
      case 'book':
        return <Book defaultColors={defaultColors} {...this.props} />;
      case 'bowl':
        return <Bowl defaultColors={defaultColors} {...this.props} />;
      case 'camera':
        return <Camera defaultColors={defaultColors} {...this.props} />;
      case 'categories':
        return <Categories defaultColors={defaultColors} {...this.props} />;
      case 'circlefilledcheckmark':
        return <CircleFilledCheckmark defaultColors={defaultColors} {...this.props} />;
      case 'clappboard':
        return <Clappboard defaultColors={defaultColors} {...this.props} />;
      case 'clipboard':
        return <Clipboard defaultColors={defaultColors} {...this.props} />;
      case 'cloud':
        return <Cloud defaultColors={defaultColors} {...this.props} />;
      case 'controllerneogeo':
        return <ControllerNeoGeo defaultColors={defaultColors} {...this.props} />;
      case 'dollarsign':
        return <DollarSign defaultColors={defaultColors} {...this.props} />;
      case 'facehappy':
        return <FaceHappy defaultColors={defaultColors} {...this.props} />;
      case 'file':
        return <File defaultColors={defaultColors} {...this.props} />;
      case 'heartfilled':
        return <HeartFilled defaultColors={defaultColors} {...this.props} />;
      case 'inbox':
        return <Inbox defaultColors={defaultColors} {...this.props} />;
      case 'lighton':
        return <LightOn defaultColors={defaultColors} {...this.props} />;
      case 'locklocked':
        return <LockLocked defaultColors={defaultColors} {...this.props} />;
      case 'musicnote':
        return <MusicNote defaultColors={defaultColors} {...this.props} />;
      case 'navigationcircle':
        return <NavigationCircle defaultColors={defaultColors} {...this.props} />;
      case 'notifications':
        return <Notifications defaultColors={defaultColors} {...this.props} />;
      case 'path':
        return <Path defaultColors={defaultColors} {...this.props} />;
      case 'running':
        return <Running defaultColors={defaultColors} {...this.props} />;
      case 'starfilled':
        return <StarFilled defaultColors={defaultColors} {...this.props} />;
      case 'video':
        return <Video defaultColors={defaultColors} {...this.props} />;
      case 'window':
        return <Window defaultColors={defaultColors} {...this.props} />;
      case 'yinyang':
        return <YinYang defaultColors={defaultColors} {...this.props} />;
      // Dashboard icons
      case 'account':
        return <Account defaultColors={defaultColors} {...this.props} />;
      case 'addfolder':
        return <AddFolder defaultColors={defaultColors} {...this.props} />;
      case 'backarrow':
        return <BackArrow defaultColors={defaultColors} {...this.props} />;
      case 'cancelfileupload':
        return <CancelFileUpload defaultColors={defaultColors} {...this.props} />;
      case 'closesharefilefoldertab':
        return <CloseShareFileFolderTab defaultColors={defaultColors} {...this.props} />;
      case 'closetab':
        return <CloseTab defaultColors={defaultColors} {...this.props} />;
      case 'colourselectedtick':
        return <ColourSelectedTick defaultColors={defaultColors} {...this.props} />;
      case 'copy':
        return <Copy defaultColors={defaultColors} {...this.props} />;
      case 'delete':
        return <Delete defaultColors={defaultColors} {...this.props} />;
      case 'download':
        return <Download defaultColors={defaultColors} {...this.props} />;
      case 'dropdownarrow':
        return <DropdownArrow defaultColors={defaultColors} {...this.props} />;
      case 'info':
        return <Info defaultColors={defaultColors} {...this.props} />;
      case 'infoon':
        return <InfoOn defaultColors={defaultColors} {...this.props} />;
      case 'nextpagearrow':
        return <NextPageArrow defaultColors={defaultColors} {...this.props} />;
      case 'repeat':
        return <Repeat defaultColors={defaultColors} {...this.props} />;
      case 'search':
        return <Search defaultColors={defaultColors} {...this.props} />;
      case 'share':
        return <Share defaultColors={defaultColors} {...this.props} />;
      case 'upload':
        return <Upload defaultColors={defaultColors} {...this.props} />;
      case 'uploading':
        return <Uploading defaultColors={defaultColors} {...this.props} />;
      default:
        return;
    }

  }

  render() {
    return this.determineIcon(this.props.name.toLowerCase());
  }
}

export default Icon;