import type { CairnApi } from "../shared/ipc.js";

declare global {
  interface Window { cairn: CairnApi }
}
export {};
