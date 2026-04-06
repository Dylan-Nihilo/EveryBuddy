import os from "node:os";
import path from "node:path";
export function defaultStorageDir() {
    return path.join(os.homedir(), ".terminal-buddy");
}
export function configFilePath(storageDir = defaultStorageDir()) {
    return path.join(storageDir, "config.json");
}
export function companionFilePath(storageDir = defaultStorageDir()) {
    return path.join(storageDir, "companion.json");
}
//# sourceMappingURL=paths.js.map