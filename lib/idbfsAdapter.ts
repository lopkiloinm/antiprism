"use client";

type IdbfsFs = Awaited<ReturnType<typeof import("@wwog/idbfs").mount>>;

export interface FileManagerItem {
  id: string;
  size?: number;
  date: Date;
  type: "folder" | "file";
  lazy?: boolean;
}

export async function buildFileManagerData(fs: IdbfsFs, rootPath: string = "/"): Promise<FileManagerItem[]> {
  const items: FileManagerItem[] = [];

  try {
    const { dirs, files } = await fs.readdir(rootPath);

    for (const dir of dirs) {
      const path = rootPath === "/" ? `/${dir.name}` : `${rootPath}/${dir.name}`;
      items.push({
        id: path,
        size: 4096,
        date: new Date(),
        type: "folder",
        lazy: true,
      });
    }

    for (const file of files) {
      const path = rootPath === "/" ? `/${file.name}` : `${rootPath}/${file.name}`;
      const stat = await fs.stat(path).catch(() => null);
      items.push({
        id: path,
        size: stat?.size ?? 0,
        date: new Date(),
        type: "file",
      });
    }
  } catch {
    // Empty directory or error
  }

  return items;
}

export async function loadLazyFolder(
  fs: IdbfsFs,
  path: string
): Promise<FileManagerItem[]> {
  return buildFileManagerData(fs, path);
}
