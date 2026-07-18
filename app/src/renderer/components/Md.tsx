import type { ReactNode } from "react";

// ---- Inline text: **bold**, *italic*, and `code`, with code allowed inside
// the other two (real briefs bold whole phrases that contain file names).
// Every helper builds React elements — never injected HTML.

function chunks(
  text: string,
  pattern: RegExp,
  wrap: (inner: string, key: string) => ReactNode,
  rest: (t: string, pre: string) => ReactNode[],
  pre: string,
): ReactNode[] {
  const re = new RegExp(pattern.source, "g"); // fresh regex — no shared lastIndex
  const out: ReactNode[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(...rest(text.slice(last, m.index), `${pre}.${i}r`));
    out.push(wrap(m[1], `${pre}.${i}`));
    last = m.index + m[0].length;
    i += 1;
  }
  if (last < text.length) out.push(...rest(text.slice(last), `${pre}.t`));
  return out;
}

const plain = (t: string): ReactNode[] => (t ? [t] : []);
const codeSpans = (t: string, pre: string): ReactNode[] =>
  chunks(t, /`([^`]+)`/, (inner, key) => <code className="mono" key={key}>{inner}</code>, plain, pre);
const italics = (t: string, pre: string): ReactNode[] =>
  chunks(t, /\*([^\s*][^*]*[^\s*]|[^\s*])\*/, (inner, key) => <em key={key}>{codeSpans(inner, key)}</em>, codeSpans, pre);
const inline = (text: string): ReactNode[] =>
  chunks(text, /\*\*([^*]+)\*\*/, (inner, key) => <strong key={key}>{italics(inner, key)}</strong>, italics, "i");

// ---- Blocks: headings, paragraphs (wrapped lines joined), bullet and numbered
// lists with indented sub-points, fenced code blocks, simple tables, rules.

type ListNode = { ordered: boolean; start: number; items: ItemNode[] };
type ItemNode = { text: string; children: ListNode[] };
type TableNode = { header: string[]; rows: string[][] };
type Block =
  | { kind: "heading"; level: 1 | 2 | 3; text: string }
  | { kind: "para"; text: string }
  | { kind: "list"; list: ListNode }
  | { kind: "code"; text: string }
  | { kind: "table"; table: TableNode }
  | { kind: "rule" };

const ITEM_RE = /^(\s*)(?:([-*])|(\d{1,3})[.)])\s+(.*)$/;
const FENCE_RE = /^\s*```/;
const RULE_RE = /^\s*-{3,}\s*$/;
const ROW_RE = /^\s*\|.*\|\s*$/;
const SEP_RE = /^\s*\|(?:\s*:?-{3,}:?\s*\|)+\s*$/;

const splitRow = (line: string): string[] =>
  line.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map((c) => c.trim());

function parse(text: string): Block[] {
  const lines = text.split(/\r?\n/);
  const blocks: Block[] = [];
  let para: string[] = [];
  let fence: string[] | null = null;
  let table: TableNode | null = null;
  // Open lists, outermost first; `indent` is the column the list's markers sit at.
  const stack: { indent: number; list: ListNode }[] = [];

  const flushPara = () => {
    if (para.length) { blocks.push({ kind: "para", text: para.join(" ") }); para = []; }
  };
  const closeLists = () => { stack.length = 0; };
  const flushTable = () => {
    if (table) { blocks.push({ kind: "table", table }); table = null; }
  };
  const openList = (indent: number, list: ListNode) => {
    const top = stack[stack.length - 1];
    const parent = top?.list.items[top.list.items.length - 1];
    if (parent) parent.children.push(list);
    else blocks.push({ kind: "list", list });
    stack.push({ indent, list });
  };

  for (let i = 0; i < lines.length; i += 1) {
    const raw = lines[i];
    const line = raw.replace(/\s+$/, "");

    if (fence) {
      if (FENCE_RE.test(line)) { blocks.push({ kind: "code", text: fence.join("\n") }); fence = null; }
      else fence.push(raw);
      continue;
    }
    if (table) {
      if (ROW_RE.test(line) && !SEP_RE.test(line)) { table.rows.push(splitRow(line)); continue; }
      flushTable(); // this line is something else — fall through and treat it normally
    }
    if (FENCE_RE.test(line)) { flushPara(); closeLists(); fence = []; continue; }
    if (ROW_RE.test(line) && SEP_RE.test(lines[i + 1] ?? "")) {
      flushPara(); closeLists();
      table = { header: splitRow(line), rows: [] };
      i += 1; // the |---|---| row is markup, not content
      continue;
    }
    const h = line.match(/^(#{1,3})\s+(.*)$/);
    if (h) {
      flushPara(); closeLists();
      blocks.push({ kind: "heading", level: h[1].length as 1 | 2 | 3, text: h[2] });
      continue;
    }
    if (RULE_RE.test(line)) { flushPara(); closeLists(); blocks.push({ kind: "rule" }); continue; }
    const item = line.match(ITEM_RE);
    if (item) {
      flushPara();
      const indent = item[1].length;
      const ordered = item[3] !== undefined;
      const start = ordered ? parseInt(item[3], 10) : 1;
      while (stack.length && stack[stack.length - 1].indent > indent) stack.pop();
      const top = stack[stack.length - 1];
      if (top && top.indent === indent && top.list.ordered !== ordered) stack.pop(); // sibling list of the other kind
      const open = stack[stack.length - 1];
      if (open && open.indent === indent && open.list.ordered === ordered) {
        open.list.items.push({ text: item[4], children: [] });
      } else {
        openList(indent, { ordered, start, items: [{ text: item[4], children: [] }] });
      }
      continue;
    }
    if (line.trim() === "") { flushPara(); closeLists(); continue; }
    const indent = line.length - line.trimStart().length;
    if (stack.length && indent >= 2) {
      // A wrapped continuation of the most recent list item.
      const top = stack[stack.length - 1];
      const lastItem = top.list.items[top.list.items.length - 1];
      if (lastItem) { lastItem.text += ` ${line.trim()}`; continue; }
    }
    if (stack.length) closeLists(); // unindented prose ends the list
    para.push(line.trim()); // wrapped paragraph lines join into one
  }
  if (fence) blocks.push({ kind: "code", text: fence.join("\n") });
  flushTable();
  flushPara();
  return blocks;
}

function renderList(list: ListNode, key: string): ReactNode {
  const items = list.items.map((it, i) => (
    <li key={i}>
      {inline(it.text)}
      {it.children.map((c, j) => renderList(c, `${i}.${j}`))}
    </li>
  ));
  return list.ordered
    ? <ol key={key} start={list.start !== 1 ? list.start : undefined}>{items}</ol>
    : <ul key={key}>{items}</ul>;
}

/** Tiny, safe markdown: built as React elements, never injected HTML. */
export function Md({ text }: { text: string }) {
  return (
    <div className="md">
      {parse(text).map((b, k) => {
        switch (b.kind) {
          case "heading": {
            const H = (["h1", "h2", "h3"] as const)[b.level - 1];
            return <H key={k}>{inline(b.text)}</H>;
          }
          case "para":
            return <p key={k}>{inline(b.text)}</p>;
          case "list":
            return renderList(b.list, `l${k}`);
          case "code":
            return <pre className="md-code mono" key={k}><code>{b.text}</code></pre>;
          case "rule":
            return <hr className="md-rule" key={k} />;
          case "table":
            return (
              <div className="md-table-wrap" key={k}>
                <table className="md-table">
                  <thead>
                    <tr>{b.table.header.map((c, i) => <th key={i}>{inline(c)}</th>)}</tr>
                  </thead>
                  <tbody>
                    {b.table.rows.map((r, i) => (
                      <tr key={i}>{r.map((c, j) => <td key={j}>{inline(c)}</td>)}</tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
        }
      })}
    </div>
  );
}
