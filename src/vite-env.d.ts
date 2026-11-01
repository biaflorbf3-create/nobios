/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_DATA_SOURCE?: 'http' | 'mock';
}

declare const __GITHUB_REPO__: string;
