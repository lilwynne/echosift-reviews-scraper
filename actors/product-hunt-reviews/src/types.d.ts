declare module "undici" {
  export class ProxyAgent {
    constructor(uri: string);
  }
}

declare module "playwright" {
  export const chromium: {
    launch(options?: {
      headless?: boolean;
      proxy?: {
        server: string;
        username?: string;
        password?: string;
      };
    }): Promise<{
      newContext(options?: {
        userAgent?: string;
        locale?: string;
        extraHTTPHeaders?: Record<string, string>;
      }): Promise<{
        newPage(): Promise<{
          mouse: {
            wheel(deltaX: number, deltaY: number): Promise<void>;
          };
          setDefaultNavigationTimeout(timeout: number): void;
          setDefaultTimeout(timeout: number): void;
          goto(
            url: string,
            options?: {
              waitUntil?: "load" | "domcontentloaded" | "networkidle";
              timeout?: number;
            }
          ): Promise<unknown>;
          waitForLoadState(
            state: "load" | "domcontentloaded" | "networkidle",
            options?: {
              timeout?: number;
            }
          ): Promise<void>;
          waitForTimeout(timeout: number): Promise<void>;
          content(): Promise<string>;
        }>;
      }>;
      close(): Promise<void>;
    }>;
  };
}
