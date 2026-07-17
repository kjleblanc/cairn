import { contextBridge } from "electron";

contextBridge.exposeInMainWorld("cairn", { ready: true });
