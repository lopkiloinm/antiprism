declare module "pandoc-wasm" {
  export interface ConvertOptions {
    from?: string;
    to?: string;
    standalone?: boolean;
    [key: string]: unknown;
  }

  export interface ConvertResult {
    stdout?: string;
    stderr?: string;
    warnings?: unknown[];
    files?: Record<string, string | Blob>;
    mediaFiles?: Record<string, string | Blob>;
  }

  export function convert(
    options: ConvertOptions,
    stdin: string | null,
    files: Record<string, string | Blob>
  ): Promise<ConvertResult>;
}
