"use client";

import * as Y from "yjs";
import { IndexeddbPersistence } from "y-indexeddb";
import { WebrtcProvider } from "y-webrtc";

interface FileDocument {
  doc: Y.Doc;
  text: Y.Text;
  persistence: IndexeddbPersistence;
  webrtcProvider?: WebrtcProvider;
  lastAccessed: number;
}

export class FileDocumentManager {
  private documents = new Map<string, FileDocument>();
  private projectId: string;
  private globalWebrtcProvider: WebrtcProvider;

  constructor(projectId: string, globalWebrtcProvider: WebrtcProvider) {
    this.projectId = projectId;
    this.globalWebrtcProvider = globalWebrtcProvider;
  }

  /**
   * Get or create a Yjs document for a specific file
   */
  getDocument(filePath: string): FileDocument {
    let doc = this.documents.get(filePath);
    
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
    // Create unique document name based on project and file path
    const docName = `${this.projectId}-${filePath}`;
    
    const doc = new Y.Doc();
    const text = doc.getText("content");
    const persistence = new IndexeddbPersistence(docName, doc);
    
    // Create WebRTC provider for this specific file
    const webrtcProvider = new WebrtcProvider(`${docName}-webrtc`, doc);
    
    // Debug logging
    persistence.on('synced', () => {
      console.log(`🔄 File persistence synced: ${filePath}`);
      console.log(`✅ IndexedDB persistence confirmed for: ${filePath}`);
    });
    
    persistence.on('load', () => {
      console.log(`📂 File persistence loaded: ${filePath}`);
      const loadedContent = text.toString();
      console.log(`📖 Loaded ${loadedContent.length} characters from IndexedDB: ${filePath}`);
      
      // Signal that IndexedDB has loaded
      (doc as any)._indexedDbLoaded = true;
    });
    
    // Log WebRTC connection status
    webrtcProvider.on('status', (event: any) => {
      console.log(`🌐 WebRTC status for ${filePath}:`, event.status);
    });
    
    webrtcProvider.on('peers', (event: any) => {
      console.log(`👥 WebRTC peers for ${filePath}:`, event.peers.length);
    });
    
    doc.on('update', (update: any, origin: any) => {
      const contentLength = text.toString().length;
      console.log(`💾 File updated: ${filePath}`, { 
        origin, 
        updateLength: update.length,
        contentLength,
        timestamp: new Date().toISOString()
      });
      
      // Log when IndexedDB persistence writes
      if (origin !== 'IndexeddbPersistence') {
        console.log(`📝 Writing to IndexedDB: ${filePath} (${contentLength} chars)`);
      } else {
        console.log(`📥 IndexedDB sync update: ${filePath} (${contentLength} chars)`);
      }
      
      // Log WebRTC sync
      if (origin === 'webrtc') {
        console.log(`🌐 WebRTC sync received: ${filePath} (${contentLength} chars)`);
      }
    });

    return {
      doc,
      text,
      persistence,
      webrtcProvider,
      lastAccessed: Date.now()
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
      console.log(`🗑️ File document destroyed: ${filePath}`);
    }
  }

  /**
   * Cleanup old documents (optional - for memory management)
   */
  cleanup(maxAge: number = 30 * 60 * 1000): void { // 30 minutes default
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
    for (const [path, doc] of this.documents.entries()) {
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
