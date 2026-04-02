import os from "node:os";
import path from "node:path";

export function defaultStorageDir(): string {
  return path.join(os.homedir(), ".terminal-buddy");
}

export function configFilePath(storageDir = defaultStorageDir()): string {
  return path.join(storageDir, "config.json");
}

export function companionFilePath(storageDir = defaultStorageDir()): string {
  return path.join(storageDir, "companion.json");
}
