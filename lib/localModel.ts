"use client";

import {
  initializeModel as _initializeModel,
  generateChatResponse as _generateChatResponse,
  getDownloadProgress,
  getDownloadStats,
  setProgressCallback,
  isDownloading,
  isModelLoading,
  checkWebGPUSupport as _checkWebGPUSupport,
} from "./localModelRuntime";

export function checkWebGPUSupport(): boolean {
  return _checkWebGPUSupport();
}

export async function initializeModel(): Promise<boolean> {
  return _initializeModel();
}

export async function generateChatResponse(
  userMessage: string,
  context?: string
): Promise<string> {
  return _generateChatResponse(userMessage, context);
}

export {
  getDownloadProgress,
  getDownloadStats,
  setProgressCallback,
  isDownloading,
  isModelLoading,
};
