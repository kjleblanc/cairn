export function dispositionOf(text: string): "DONE" | "STOPPED" | "UNKNOWN" {
  if (/Disposition:\s*DONE/i.test(text)) return "DONE";
  if (/Disposition:\s*STOPPED/i.test(text)) return "STOPPED";
  return "UNKNOWN";
}

export function finalVerdictOf(text: string): string {
  const m = text.match(/FINAL VERDICT:\s*([A-Z ]+)/);
  return m ? m[1].trim() : "NO VERDICT";
}
