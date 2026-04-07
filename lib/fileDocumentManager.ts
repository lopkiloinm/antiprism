"use client";

import * as Y from "yjs";
import { IndexeddbPersistence } from "y-indexeddb";
import { WebrtcProvider } from "y-webrtc";
import { yjsLogger } from "./logger";

export interface FileDocument {
  doc: Y.Doc;
  text: Y.Text;
  persistence: IndexeddbPersistence;
  webrtcProvider?: WebrtcProvider;
  lastAccessed: number;
  whenLoaded: Promise<void>;
}

export class FileDocumentManager {
  private documents = new Map<string, FileDocument>();
  private projectId: string;
  private globalWebrtcProvider: WebrtcProvider | null;
  private providerOptions: any;

  constructor(projectId: string, globalWebrtcProvider: WebrtcProvider | null, providerOptions: any = {}) {
    this.projectId = projectId;
    this.globalWebrtcProvider = globalWebrtcProvider;
    this.providerOptions = providerOptions;
  }

  /**
   * Get or create a Yjs document for a specific file
   */
  getDocument(filePath: string, silent = false): FileDocument {
    let doc = this.documents.get(filePath);
    const existed = !!doc;
    
    if (!doc) {
      doc = this.createDocument(filePath);
      this.documents.set(filePath, doc);
    }
    
    doc.lastAccessed = Date.now();
    return doc;
  }

  /**
   * Create a new Yjs document with persistence for a file
   */
  private createDocument(filePath: string): FileDocument {
    const docName = `${this.projectId}-${filePath}`;
    
    const doc = new Y.Doc();
    const text = doc.getText("content");
    const persistence = new IndexeddbPersistence(docName, doc);
    
    let webrtcProvider: WebrtcProvider | undefined;
    if (this.providerOptions && this.providerOptions.signaling && this.providerOptions.signaling.length > 0) {
      webrtcProvider = new WebrtcProvider(`${docName}-webrtc`, doc, this.providerOptions);
    }
    
    let loaded = false;
    const whenLoaded = new Promise<void>((resolve) => {
      const done = () => {
        if (loaded) return;
        loaded = true;
        (doc as any)._indexedDbLoaded = true;
        resolve();
      };

      persistence.on('synced', done);
      persistence.on('load', done);

      setTimeout(() => {
        if (!loaded) done();
      }, 3000);
    });

    return {
      doc,
      text,
      persistence,
      webrtcProvider,
      lastAccessed: Date.now(),
      whenLoaded
    };
  }

  /**
   * Get the Y.Text for a file
   */
  getText(filePath: string): Y.Text {
    return this.getDocument(filePath).text;
  }

  /**
   * Get the WebRTC provider for a file
   */
  getWebrtcProvider(filePath: string): WebrtcProvider | null {
    const doc = this.documents.get(filePath);
    return doc?.webrtcProvider || null;
  }

  /**
   * Check if a file has a document
   */
  hasDocument(filePath: string): boolean {
    return this.documents.has(filePath);
  }

  /**
   * Remove a document (cleanup)
   */
  removeDocument(filePath: string): void {
    const doc = this.documents.get(filePath);
    if (doc) {
      doc.persistence.destroy();
      doc.webrtcProvider?.destroy();
      doc.doc.destroy();
      this.documents.delete(filePath);
    }
  }

  /**
   * Cleanup old documents (optional - for memory management)
   */
  cleanup(maxAge: number = 30 * 60 * 1000): void {
    const now = Date.now();
    for (const [path, doc] of this.documents.entries()) {
      if (now - doc.lastAccessed > maxAge) {
        this.removeDocument(path);
      }
    }
  }

  /**
   * Destroy all documents
   */
  destroy(): void {
    for (const [, doc] of this.documents.entries()) {
      doc.persistence.destroy();
      doc.webrtcProvider?.destroy();
      doc.doc.destroy();
    }
    this.documents.clear();
  }

  /**
   * Get all document paths
   */
  getDocumentPaths(): string[] {
    return Array.from(this.documents.keys());
  }
}
