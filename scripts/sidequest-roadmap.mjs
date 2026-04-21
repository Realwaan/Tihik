#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const TRACK = process.argv[2] || "SideQuest";
const TICKETS_DIR = path.join(ROOT, "tickets", TRACK);
const ROADMAP_FILE = path.join(TICKETS_DIR, "ROADMAP.md");

const IGNORE_DIRS = new Set([
  ".git",
  ".next",
  "node_modules",
  ".vercel",
  "dist",
  "build",
  "out",
  "coverage",
]);

const SCAN_EXT = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".mjs",
  ".cjs",
  ".json",
  ".md",
  ".css",
]);

const CODE_EXT = new Set([".ts", ".tsx", ".js", ".mjs", ".cjs"]);

const LARGE_FILE_LINES = 300;
const findings = {
  "large-file": [],
  debug: [],
};

const tickets = [];
let scannedFiles = 0;

function toPosix(p) {
  return p.split(path.sep).join("/");
}

function rel(p) {
  return toPosix(path.relative(ROOT, p));
}

function countLines(content) {
  if (!content) return 0;
  return content.split(/\r?\n/).length;
}

async function walk(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      if (IGNORE_DIRS.has(entry.name)) continue;
      await walk(full);
      continue;
    }

    const ext = path.extname(entry.name).toLowerCase();
    if (!SCAN_EXT.has(ext)) continue;

    scannedFiles += 1;

    if (!CODE_EXT.has(ext)) continue;

    const content = await fs.readFile(full, "utf8");
    const lineCount = countLines(content);

    if (lineCount > LARGE_FILE_LINES) {
      findings["large-file"].push({ file: rel(full), lineCount });
    }

    if (/\bconsole\.log\s*\(|\bdebugger\b/.test(content)) {
      findings.debug.push({ file: rel(full) });
    }
  }
}

function addTicket(id, title, rationale, actions) {
  tickets.push({ id, title, rationale, actions });
}

function buildTickets() {
  const largeSorted = [...findings["large-file"]].sort((a, b) => b.lineCount - a.lineCount);

  largeSorted.slice(0, 10).forEach((item, idx) => {
    addTicket(
      `SQ-${String(idx + 1).padStart(3, "0")}`,
      `Refactor oversized module: ${item.file}`,
      `File has ${item.lineCount} lines, above the ${LARGE_FILE_LINES}-line maintainability threshold.`,
      [
        "Split by feature boundary or hook/component/service layers.",
        "Add focused unit tests around extracted logic.",
        "Re-run lint and type checks before merge.",
      ]
    );
  });

  findings.debug.forEach((item, idx) => {
    addTicket(
      `SQ-${String(largeSorted.slice(0, 10).length + idx + 1).padStart(3, "0")}`,
      `Remove debug artifact: ${item.file}`,
      "Debug statements can leak noise or sensitive context in production logs.",
      [
        "Remove console/debugger statements.",
        "Replace with structured logging where needed.",
        "Add lint rule to prevent regressions.",
      ]
    );
  });
}

function renderRoadmap() {
  const issueCount = findings["large-file"].length + findings.debug.length;

  const topFindings = [
    `- large-file: ${findings["large-file"].length}`,
    `- debug: ${findings.debug.length}`,
  ].join("\n");

  const ticketLines = tickets.length
    ? tickets
        .map(
          (t) =>
            `### ${t.id} - ${t.title}\n` +
            `Rationale: ${t.rationale}\n` +
            `Actions:\n${t.actions.map((a, i) => `${i + 1}. ${a}`).join("\n")}\n`
        )
        .join("\n")
    : "No actionable tickets generated. Repository is currently below configured thresholds.";

  return [
    "# SideQuest Roadmap",
    "",
    `Generated: ${new Date().toISOString()}`,
    `Repository: ${path.basename(ROOT)}`,
    "",
    "## Summary",
    `- Scanned Files: ${scannedFiles}`,
    `- Issues Found: ${issueCount}`,
    `- Tickets Generated: ${tickets.length}`,
    `- Roadmap File: ${rel(ROADMAP_FILE)}`,
    "",
    "## Top Findings",
    topFindings,
    "",
    "## Suggested Features",
    "- Create a refactor roadmap for oversized modules and track progress per sprint.",
    "- Add end-to-end smoke checks for core user flows and publish pass/fail status daily.",
    "",
    "## Tickets",
    ticketLines,
    "",
  ].join("\n");
}

async function main() {
  await walk(ROOT);
  buildTickets();

  const roadmap = renderRoadmap();
  await fs.mkdir(TICKETS_DIR, { recursive: true });
  await fs.writeFile(ROADMAP_FILE, roadmap, "utf8");

  const issueCount = findings["large-file"].length + findings.debug.length;

  console.log("Roadmap Generated");
  console.log(`Scanned ${ROOT} and built execution roadmap`);
  console.log("Scanned Files");
  console.log(String(scannedFiles));
  console.log("Issues Found");
  console.log(String(issueCount));
  console.log("Tickets Generated");
  console.log(String(tickets.length));
  console.log("Roadmap File");
  console.log(rel(ROADMAP_FILE));
  console.log("Top Findings");
  console.log(`- large-file: ${findings["large-file"].length}`);
  console.log(`- debug: ${findings.debug.length}`);
  console.log("Next Step");
  console.log(`Review ${rel(ROADMAP_FILE)}, then run /load-tickets ${TRACK} #channel.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
