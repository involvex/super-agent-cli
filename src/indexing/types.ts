export interface FileIndexEntry {
  path: string; // Relative path
  size: number;
  lastModified: number;
  isDirectory: boolean;
  // contentHash?: string; // Future optimization
}

export interface IndexMetadata {
  version: number;
  lastScan: number;
  rootPath: string;
}

export interface FileIndex {
  metadata: IndexMetadata;
  entries: FileIndexEntry[];
}
