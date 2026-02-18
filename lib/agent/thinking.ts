export function stripThinking(rawOutput: string): { thinking: string; output: string } {
  const raw = rawOutput || "";
  const m = raw.match(/<think>([\s\S]*?)<\/think>/i);
  if (!m) return { thinking: "", output: raw };

  const thinking = (m[1] || "").trim();
  const after = raw.slice((m.index || 0) + m[0].length);
  return { thinking, output: after.trimStart() };
}
