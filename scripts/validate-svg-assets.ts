import { promises as fs } from "node:fs";
import path from "node:path";

interface SvgIssue {
  filePath: string;
  line: number;
  message: string;
}

interface SvgStats {
  commentBytes: number;
  sizeBytes: number;
}

const REPO_ROOT = process.cwd();
const SOURCE_DIR = path.join(REPO_ROOT, "public", "data");

async function walkSvgFiles(dir: string): Promise<string[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        return walkSvgFiles(fullPath);
      }
      if (entry.isFile() && entry.name.toLowerCase().endsWith(".svg")) {
        return [fullPath];
      }
      return [];
    }),
  );

  return nested.flat().sort((left, right) => left.localeCompare(right));
}

function toRepoPath(filePath: string): string {
  return path.relative(REPO_ROOT, filePath).split(path.sep).join("/");
}

function countNewlines(text: string): number {
  return (text.match(/\n/g) ?? []).length;
}

function collectCommentBytes(svgText: string): number {
  const comments = svgText.match(/<!--[\s\S]*?-->/g) ?? [];
  return comments.reduce((total, comment) => total + Buffer.byteLength(comment, "utf8"), 0);
}

function parseTagAttributes(attrsRaw: string, filePath: string, line: number): SvgIssue[] {
  const issues: SvgIssue[] = [];
  const seen = new Set<string>();
  let index = 0;

  while (index < attrsRaw.length) {
    const whitespaceMatch = /^\s+/.exec(attrsRaw.slice(index));
    if (whitespaceMatch) {
      index += whitespaceMatch[0].length;
      continue;
    }

    const attrMatch = /^([A-Za-z_][\w:.-]*)\s*=\s*("([^"]*)"|'([^']*)')/.exec(
      attrsRaw.slice(index),
    );
    if (!attrMatch) {
      issues.push({
        filePath,
        line,
        message: `Invalid attribute syntax near \`${attrsRaw.slice(index).trim()}\`.`,
      });
      break;
    }

    const name = attrMatch[1];
    if (seen.has(name)) {
      issues.push({
        filePath,
        line,
        message: `Duplicate attribute \`${name}\`.`,
      });
    }

    seen.add(name);
    index += attrMatch[0].length;
  }

  return issues;
}

export function validateSvgText(filePath: string, svgText: string): SvgIssue[] {
  const issues: SvgIssue[] = [];
  const stack: Array<{ line: number; name: string }> = [];
  let index = 0;
  let line = 1;

  while (index < svgText.length) {
    if (svgText[index] !== "<") {
      if (svgText[index] === "\n") {
        line += 1;
      }
      index += 1;
      continue;
    }

    const start = index;
    const startLine = line;

    if (svgText.startsWith("<!--", index)) {
      const commentEnd = svgText.indexOf("-->", index + 4);
      if (commentEnd === -1) {
        issues.push({
          filePath,
          line: startLine,
          message: "Unterminated XML comment.",
        });
        break;
      }

      const token = svgText.slice(index, commentEnd + 3);
      const commentBody = svgText.slice(index + 4, commentEnd);
      if (commentBody.includes("--")) {
        issues.push({
          filePath,
          line: startLine,
          message: "Invalid XML comment contains `--` in its body.",
        });
      }
      line += countNewlines(token);
      index = commentEnd + 3;
      continue;
    }

    let cursor = index + 1;
    let quote: '"' | "'" | null = null;
    while (cursor < svgText.length) {
      const char = svgText[cursor];
      if (quote) {
        if (char === quote) {
          quote = null;
        }
      } else if (char === '"' || char === "'") {
        quote = char;
      } else if (char === ">") {
        break;
      }
      cursor += 1;
    }

    if (cursor >= svgText.length) {
      issues.push({
        filePath,
        line: startLine,
        message: "Unterminated tag.",
      });
      break;
    }

    const token = svgText.slice(start, cursor + 1);
    line += countNewlines(token);
    index = cursor + 1;

    if (token.startsWith("<?") || token.startsWith("<!")) {
      continue;
    }

    if (token.startsWith("</")) {
      const closeMatch = /^<\/\s*([A-Za-z_][\w:.-]*)\s*>$/.exec(token);
      if (!closeMatch) {
        issues.push({
          filePath,
          line: startLine,
          message: `Invalid closing tag syntax \`${token.trim()}\`.`,
        });
        continue;
      }

      const closingName = closeMatch[1];
      const expected = stack.pop();
      if (!expected) {
        issues.push({
          filePath,
          line: startLine,
          message: `Unexpected closing tag \`${closingName}\`.`,
        });
        continue;
      }

      if (expected.name !== closingName) {
        issues.push({
          filePath,
          line: startLine,
          message: `Closing tag \`${closingName}\` does not match open tag \`${expected.name}\` from line ${expected.line}.`,
        });
      }
      continue;
    }

    const selfClosing = /\/\s*>$/.test(token);
    const openMatch = /^<\s*([A-Za-z_][\w:.-]*)([\s\S]*?)(?:\/)?>$/.exec(token);
    if (!openMatch) {
      issues.push({
        filePath,
        line: startLine,
        message: `Invalid opening tag syntax \`${token.trim()}\`.`,
      });
      continue;
    }

    const tagName = openMatch[1];
    const attrsRaw = openMatch[2] ?? "";
    issues.push(...parseTagAttributes(attrsRaw, filePath, startLine));

    if (!selfClosing) {
      stack.push({ line: startLine, name: tagName });
    }
  }

  while (stack.length > 0) {
    const unclosed = stack.pop()!;
    issues.push({
      filePath,
      line: unclosed.line,
      message: `Unclosed tag \`${unclosed.name}\`.`,
    });
  }

  return issues;
}

async function main() {
  const svgFiles = await walkSvgFiles(SOURCE_DIR);
  const issues: SvgIssue[] = [];
  let totalBytes = 0;
  let totalCommentBytes = 0;
  let commentHeavyFiles = 0;

  for (const filePath of svgFiles) {
    const svgText = await fs.readFile(filePath, "utf8");
    const stats: SvgStats = {
      commentBytes: collectCommentBytes(svgText),
      sizeBytes: Buffer.byteLength(svgText, "utf8"),
    };

    totalBytes += stats.sizeBytes;
    totalCommentBytes += stats.commentBytes;

    if (stats.sizeBytes > 0 && stats.commentBytes / stats.sizeBytes >= 0.25) {
      commentHeavyFiles += 1;
    }

    issues.push(...validateSvgText(toRepoPath(filePath), svgText));
  }

  process.stdout.write(
    `Validated ${svgFiles.length} SVG source files under public/data (${totalBytes} bytes).\n`,
  );
  process.stdout.write(
    `${commentHeavyFiles} files are at least 25% comments (${totalCommentBytes} comment bytes total).\n`,
  );

  if (issues.length === 0) {
    process.stdout.write("SVG validation passed.\n");
    return;
  }

  process.stderr.write(`SVG validation failed with ${issues.length} issue(s):\n`);
  for (const issue of issues) {
    process.stderr.write(`- ${issue.filePath}:${issue.line} ${issue.message}\n`);
  }
  process.exitCode = 1;
}

await main();
