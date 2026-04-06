import type { CCSessionJSON } from "../runtime/cc-types.js";
import type { BuddyLanguage, CompanionRecord } from "../types/companion.js";
export declare function runCCStatusLineCommand(): Promise<void>;
export declare function renderCompanionStatusLine(companion: CompanionRecord, session: CCSessionJSON | null, language: BuddyLanguage): string;
export declare function renderEmptyStatusLine(session: CCSessionJSON | null): string;
export declare function composeSideBySide(spriteLines: string[], rightLines: string[], centerRight?: boolean): string;
export declare function buildInfoBar(session: CCSessionJSON | null, language: BuddyLanguage): string;
export declare function parseSessionJSON(raw: string): CCSessionJSON | null;
