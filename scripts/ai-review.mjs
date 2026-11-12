#!/usr/bin/env node
/**
 * Pull-request review via the xAI chat API.
 * Skips cleanly when XAI_API_KEY is unset so CI stays green before the owner
 * adds the secret. Posts or updates one Origin comment when a pull request
 * number and the origin CLI are both available. Prints to the log and exits 0
 * when the key or the CLI is missing.
 */
import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

const MARKER = "<!-- the-14th-step-ai-review -->";
const DIFF_CAP = 14_000;

export function reviewDecision(env) {
  if (!env.XAI_API_KEY?.trim()) return { action: "skip", reason: "XAI_API_KEY is not set" };
  return { action: "review" };
}

export function clipDiff(diff) {
  const text = diff.trim();
  if (text.length <= DIFF_CAP) return text;
  return `${text.slice(0, DIFF_CAP)}\n\n[diff truncated]`;
}

export function reviewPrompt(diff) {
  return [
    "You are reviewing a pull request for The 14th Step, a recovery meeting simulator.",
    "The people using it are in recovery, sometimes at 3am, sometimes in crisis.",
    "Comment only on real bugs, privacy leaks, crisis-handling mistakes, or broken meeting flow.",
    "Skip style nits. Use short paragraphs. If nothing is wrong, say so briefly.",
    "",
    clipDiff(diff),
  ].join("\n");
}

export function pullRequestNumber(env) {
  if (env.PR_NUMBER) return String(env.PR_NUMBER);
  return "";
}

export function commentDestination(env, options = {}) {
  const originAvailable = options.originAvailable ?? true;
  const number = pullRequestNumber(env);
  if (!number || !originAvailable) return "stdout";
  return "origin";
}

export function originCliAvailable() {
  try {
    execFileSync("origin", ["--version"], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

function diffAgainstBase(env) {
  const base = env.GITHUB_BASE_REF || env.BASE_REF || "main";
  try {
    execFileSync("git", ["fetch", "origin", base, "--depth", "50"], { stdio: "ignore" });
  } catch {
    // The checkout may already contain the base.
  }
  try {
    return execFileSync("git", ["diff", `origin/${base}...HEAD`], {
      encoding: "utf8",
      maxBuffer: 8_000_000,
    });
  } catch {
    return execFileSync("git", ["diff", "HEAD~1"], { encoding: "utf8", maxBuffer: 8_000_000 });
  }
}

async function askGrok(apiKey, diff) {
  const res = await fetch("https://api.x.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "grok-4.5",
      max_tokens: 500,
      messages: [
        { role: "system", content: "You review code diffs. Be specific and brief." },
        { role: "user", content: reviewPrompt(diff) },
      ],
    }),
    signal: AbortSignal.timeout(45_000),
  });
  if (!res.ok) throw new Error(`xAI review failed (${res.status})`);
  const body = await res.json();
  const text = body?.choices?.[0]?.message?.content?.trim();
  if (!text) throw new Error("xAI review returned an empty note");
  return text;
}

function publishOnOrigin(number, body) {
  const file = execFileSync("mktemp", { encoding: "utf8" }).trim();
  try {
    writeFileSync(file, body);
    execFileSync(
      "origin",
      ["pr", "comment", String(number), "--body-file", file, "--edit-last", "--create-if-none"],
      { stdio: "inherit" },
    );
  } finally {
    try {
      execFileSync("rm", ["-f", file]);
    } catch {
      // The temp file only held the review text.
    }
  }
}

async function publish(env, body) {
  const number = pullRequestNumber(env);
  const destination = commentDestination(env, { originAvailable: originCliAvailable() });
  if (destination === "stdout") {
    console.log(body);
    if (!number) {
      console.log("AI review printed locally. Set PR_NUMBER to comment on the Origin pull request.");
    } else {
      console.log("AI review printed locally. origin CLI is not available.");
    }
    return;
  }
  try {
    publishOnOrigin(number, body);
  } catch (error) {
    console.log(body);
    console.error(error instanceof Error ? error.message : error);
    console.log("Origin comment failed. The review is in the log above.");
  }
}

async function main() {
  const decision = reviewDecision(process.env);
  if (decision.action === "skip") {
    console.log(`AI review skipped: ${decision.reason}`);
    return;
  }
  if (pullRequestNumber(process.env) && !originCliAvailable()) {
    console.log("AI review skipped: origin CLI is not available");
    return;
  }
  const diff = diffAgainstBase(process.env);
  if (!diff.trim()) {
    console.log("AI review skipped: empty diff");
    return;
  }
  const note = await askGrok(process.env.XAI_API_KEY.trim(), diff);
  const body = `${MARKER}\n**Grok review**\n\n${note}`;
  await publish(process.env, body);
}

const isDirect = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isDirect) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
