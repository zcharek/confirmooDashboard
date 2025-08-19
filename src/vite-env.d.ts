/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_CLICKUP_API_TOKEN: string;
  readonly VITE_CLICKUP_WORKSPACE_ID: string;
  readonly VITE_CLICKUP_SPRINT_FOLDER_ID: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
