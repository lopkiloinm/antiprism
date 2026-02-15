/**
 * Unified icon exports with consistent sizing.
 * All icons use size={16} and strokeWidth={2} by default.
 */
import {
  Search,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  FileText,
  Folder,
  FolderOpen,
  Loader2,
  Users,
  Plus,
  Upload,
  Download,
  Pencil,
  Trash2,
  Share2,
  LayoutGrid,
  List,
  File,
  FolderPlus,
  FilePlus,
  ZoomIn,
  ZoomOut,
  FileArchive,
  Copy,
  Send,
  Image,
} from "lucide-react";

const iconProps = { size: 16, strokeWidth: 2 };

export const IconSearch = () => <Search {...iconProps} />;
export const IconChevronDown = () => <ChevronDown {...iconProps} />;
export const IconChevronUp = () => <ChevronUp {...iconProps} />;
export const IconChevronRight = () => <ChevronRight {...iconProps} />;
export const IconFileText = () => <FileText {...iconProps} />;
export const IconFolder = () => <Folder {...iconProps} />;
export const IconFolderOpen = () => <FolderOpen {...iconProps} />;
export const IconLoader = () => <Loader2 {...iconProps} className="animate-spin" />;
export const IconUsers = () => <Users {...iconProps} />;
export const IconPlus = () => <Plus {...iconProps} />;
export const IconUpload = () => <Upload {...iconProps} />;
export const IconDownload = () => <Download {...iconProps} />;
export const IconPencil = () => <Pencil {...iconProps} />;
export const IconTrash2 = () => <Trash2 {...iconProps} />;
export const IconShare2 = () => <Share2 {...iconProps} />;
export const IconLayoutGrid = () => <LayoutGrid {...iconProps} />;
export const IconList = () => <List {...iconProps} />;
export const IconFile = () => <File {...iconProps} />;
export const IconFolderPlus = () => <FolderPlus {...iconProps} />;
export const IconFilePlus = () => <FilePlus {...iconProps} />;
export const IconZoomIn = () => <ZoomIn {...iconProps} />;
export const IconZoomOut = () => <ZoomOut {...iconProps} />;
export const IconFileArchive = () => <FileArchive {...iconProps} />;
export const IconCopy = () => <Copy {...iconProps} />;
export const IconSend = () => <Send {...iconProps} />;
export const IconImage = () => <Image {...iconProps} />;
