import type { CompanionRecord } from "../types/companion.js";
export interface SignedCompanionRecord extends CompanionRecord {
    _sig?: string | undefined;
    _env?: boolean | undefined;
}
/** Sign a companion record before writing to disk. */
export declare function signRecord(record: CompanionRecord): SignedCompanionRecord;
export interface IntegrityStatus {
    valid: boolean;
    envSeeded: boolean;
    userMismatch: boolean;
}
/** Verify a companion record's integrity. */
export declare function verifyRecord(record: SignedCompanionRecord): IntegrityStatus;
