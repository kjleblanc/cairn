import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, symlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

/**
 * Task 054: produce a differently spelled alias of the same real directory —
 * the condition GitHub's Windows runners create by addressing TEMP through an
 * 8.3 short name (RUNNER~1). On win32 the alias is the short-name spelling
 * (chcp 65001 keeps cmd's echo decodable as UTF-8; the quoted echo keeps a
 * literal & in an 8.3-fitting component from splitting the command). On POSIX
 * it is a symlinked spelling; git reports the physical path either way.
 * Returns null when the filesystem offers no distinct alias.
 */
export function aliasedSpelling(root: string): string | null {
  if (process.platform === "win32") {
    const echoed = (
      spawnSync(
        "cmd.exe",
        ["/d", "/s", "/c", `"chcp 65001>nul & for %I in ("${root}") do @echo "%~sI""`],
        { encoding: "utf8", windowsVerbatimArguments: true },
      ).stdout ?? ""
    ).trim();
    const short = echoed.replace(/^"|"$/g, "");
    if (!short || short.toLowerCase() === resolve(root).toLowerCase() || !existsSync(short)) {
      return null;
    }
    return short;
  }
  const link = join(mkdtempSync(join(tmpdir(), "cairn-alias-")), "alias");
  symlinkSync(root, link);
  return link;
}
