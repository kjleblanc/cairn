import {
  closeSync,
  constants,
  fsyncSync,
  openSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { randomUUID } from "node:crypto";

type ReplaceFile = (temporaryPath: string, targetPath: string) => void;

/** Replace a small local text file without ever truncating the prior copy.
 * The injectable final rename exists only so the unit suite can prove the
 * failure path preserves the original and cleans its temporary file. */
export function atomicWriteText(
  targetPath: string,
  text: string,
  replaceFile: ReplaceFile = renameSync,
): void {
  const temporaryPath = `${targetPath}.${process.pid}.${randomUUID()}.tmp`;
  let descriptor: number | null = null;
  try {
    descriptor = openSync(
      temporaryPath,
      constants.O_CREAT | constants.O_EXCL | constants.O_WRONLY,
      0o600,
    );
    writeFileSync(descriptor, text, "utf8");
    fsyncSync(descriptor);
    closeSync(descriptor);
    descriptor = null;
    replaceFile(temporaryPath, targetPath);
  } finally {
    if (descriptor !== null) {
      try {
        closeSync(descriptor);
      } catch {
        // The original file is still intact; cleanup below remains best effort.
      }
    }
    try {
      rmSync(temporaryPath, { force: true });
    } catch {
      // A failed replacement must surface its original error. A locked temp
      // file contains only encrypted-key JSON and is never treated as active.
    }
  }
}
