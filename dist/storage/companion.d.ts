import { type IntegrityStatus } from "./integrity.js";
import type { CompanionRecord } from "../types/companion.js";
export declare function readCompanionRecord(storageDir?: string): Promise<CompanionRecord | null>;
export declare function writeCompanionRecord(record: CompanionRecord, storageDir?: string): Promise<void>;
export declare function checkCompanionIntegrity(storageDir?: string): Promise<IntegrityStatus | null>;
