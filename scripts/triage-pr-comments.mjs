#!/usr/bin/env node

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

// Starter triage pipeline only. This is intentionally lightweight and should
// not be treated as the final Codex-decider system.

const BOT_LOGIN_PATTERNS = [
  /coderabbit/i,
  /sourcery/i,
  /gemini/i,
  // Easy extension point:
  // /another-bot-name/i,
];

const BOT_TEXT_PATTERNS = [
  /\bcoderabbit\b/i,
  /\bsourcery\b/i,
  /\bgemini\b/i,
  // Easy extension point:
  // /\bmy-bot-brand\b/i,
];

const FIX_NOW_PATTERNS = [
  /\bsecurity\b/i,
  /\bvulnerab/i,
  /\bbug\b/i,
  /\bregression\b/i,
  /\bcrash\b/i,
  /\bwill fail\b/i,
  /\bfails?\b/i,
  /\bexception\b/i,
  /\bnull(?: pointer)?\b/i,
  /\bincorrect\b/i,
  /\bbroken\b/i,
  /\brace condition\b/i,
  /\bdata loss\b/i,
  /\bmust\b/i,
  /\brequired\b/i,
];

const MAKE_ISSUE_PATTERNS = [
  /\bperf(?:ormance)?\b/i,
  /\boptimi[sz]e\b/i,
  /\brefactor\b/i,
  /\bcleanup\b/i,
  /\bmaintainab/i,
  /\breadability\b/i,
  /\bconsider\b/i,
  /\bcould\b/i,
  /\bmaybe\b/i,
  /\bdocs?\b/i,
  /\btest coverage\b/i,
  /\bfuture\b/i,
];

const IGNORE_PATTERNS = [
  /\bnit\b/i,
  /\bnitpick\b/i,
  /\bstyle\b/i,
  /\bformat(?:ting)?\b/i,
  /\bwhitespace\b/i,
  /\blooks good\b/i,
  /\blgtm\b/i,
  /\bapproved?\b/i,
  /\bthanks\b/i,
  /\boptional\b/i,
];

const MAX_PER_BUCKET_STDOUT = 8;

function env(name, fallback = "") {
  const value = process.env[name];
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function toPrNumber(value) {
  if (!value) return null;
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : null;
}

function repoParts(repo) {
  if (!repo || !repo.includes("/")) return null;
  const [owner, name] = repo.split("/", 2);
  if (!owner || !name) return null;
  return { owner, name };
}

function summarizeText(text, max = 180) {
  const normalized = String(text || "").replace(/\s+/g, " ").trim();
  if (!normalized) return "(no text)";
  if (max <= 3) return normalized.slice(0, Math.max(0, max));
  return normalized.length > max ? `${normalized.slice(0, max - 3)}...` : normalized;
}

function scoreBucket(text, kind = "comment") {
  const body = String(text || "");
  const reasons = [];
  let fixNowScore = 0;
  let makeIssueScore = 0;
  let ignoreScore = 0;

  for (const re of FIX_NOW_PATTERNS) {
    if (re.test(body)) {
      fixNowScore += 2;
      reasons.push(`matched ${re}`);
    }
  }
  for (const re of MAKE_ISSUE_PATTERNS) {
    if (re.test(body)) {
      makeIssueScore += 1.5;
      reasons.push(`matched ${re}`);
    }
  }
  for (const re of IGNORE_PATTERNS) {
    if (re.test(body)) {
      ignoreScore += 1.25;
      reasons.push(`matched ${re}`);
    }
  }

  if (kind === "review" && !body.trim()) {
    ignoreScore += 1.5;
    reasons.push("empty review body");
  }
  if (/\bquestion\b/i.test(body) || /\bclarify\b/i.test(body)) {
    makeIssueScore += 0.75;
  }
  if (/\bduplicate\b/i.test(body)) {
    ignoreScore += 1;
  }

  let bucket = "ignore";
  let confidence = 0.45;

  if (fixNowScore >= Math.max(makeIssueScore + 1, ignoreScore + 1) && fixNowScore >= 2) {
    bucket = "fix-now";
    confidence = Math.min(0.98, 0.55 + fixNowScore * 0.08);
  } else if (
    makeIssueScore >= Math.max(fixNowScore, ignoreScore) &&
    makeIssueScore >= 1.5
  ) {
    bucket = "make-issue";
    confidence = Math.min(0.95, 0.5 + makeIssueScore * 0.1);
  } else if (ignoreScore >= 1) {
    bucket = "ignore";
    confidence = Math.min(0.95, 0.5 + ignoreScore * 0.1);
  }

  return {
    bucket,
    confidence: Number(confidence.toFixed(2)),
    reasons,
    scores: {
      fixNow: Number(fixNowScore.toFixed(2)),
      makeIssue: Number(makeIssueScore.toFixed(2)),
      ignore: Number(ignoreScore.toFixed(2)),
    },
  };
}

function looksLikeTargetBot(item) {
  const login = String(item?.author?.login || "");
  const body = String(item?.body || "");
  return (
    BOT_LOGIN_PATTERNS.some((re) => re.test(login)) ||
    BOT_TEXT_PATTERNS.some((re) => re.test(body))
  );
}

function normalizeReview(review, ctx) {
  const login = review?.user?.login || "unknown";
  const body = typeof review?.body === "string" ? review.body : "";
  const url =
    review?.html_url ||
    `${ctx.serverUrl}/${ctx.repo}/pull/${ctx.prNumber}#pullrequestreview-${review?.id ?? "unknown"}`;

  return {
    id: `review-${review?.id ?? "unknown"}`,
    numericId: review?.id ?? null,
    kind: "review",
    author: { login },
    state: review?.state || null,
    body,
    createdAt: review?.submitted_at || review?.submittedAt || review?.created_at || null,
    path: null,
    line: null,
    url,
  };
}

function normalizeComment(comment) {
  return {
    id: `comment-${comment?.id ?? "unknown"}`,
    numericId: comment?.id ?? null,
    kind: "comment",
    author: { login: comment?.user?.login || "unknown" },
    state: null,
    body: typeof comment?.body === "string" ? comment.body : "",
    createdAt: comment?.created_at || null,
    path: comment?.path || null,
    line: comment?.line ?? comment?.original_line ?? null,
    url: comment?.html_url || null,
  };
}

async function writeSummary(outputPath, summary) {
  const resolved = outputPath || "artifacts/ci-triage-summary.json";
  await mkdir(path.dirname(resolved), { recursive: true });
  await writeFile(resolved, `${JSON.stringify(summary, null, 2)}\n`, "utf8");
  return resolved;
}

function buildHeaders(token) {
  const headers = {
    Accept: "application/vnd.github+json",
    "User-Agent": "starter-ci-triage-pipeline",
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

async function fetchPaginatedJson({ url, headers }) {
  const items = [];
  let page = 1;
  while (true) {
    const pageUrl = new URL(url);
    pageUrl.searchParams.set("per_page", "100");
    pageUrl.searchParams.set("page", String(page));

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);
    let res;
    try {
      res = await fetch(pageUrl, { headers, signal: controller.signal });
    } catch (error) {
      clearTimeout(timeoutId);
      const message =
        error instanceof Error ? `${error.name}: ${error.message}` : summarizeText(String(error), 300);
      return {
        ok: false,
        status: 408,
        statusText: "Request failed",
        url: pageUrl.toString(),
        bodySnippet: summarizeText(message, 300),
        items,
      };
    }
    clearTimeout(timeoutId);
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return {
        ok: false,
        status: res.status,
        statusText: res.statusText,
        url: pageUrl.toString(),
        bodySnippet: summarizeText(text, 300),
        items,
      };
    }

    const data = await res.json();
    if (!Array.isArray(data)) {
      return {
        ok: false,
        status: 502,
        statusText: "Unexpected API response",
        url: pageUrl.toString(),
        bodySnippet: summarizeText(JSON.stringify(data), 300),
        items,
      };
    }

    items.push(...data);
    if (data.length < 100) break;
    page += 1;
  }

  return { ok: true, items };
}

function triageItems(items) {
  const buckets = {
    "fix-now": [],
    "make-issue": [],
    ignore: [],
  };

  for (const item of items) {
    const result = scoreBucket(item.body, item.kind);
    const triaged = {
      ...item,
      bucket: result.bucket,
      confidence: result.confidence,
      heuristicReasons: result.reasons,
      scores: result.scores,
      excerpt: summarizeText(item.body, 220),
    };
    buckets[result.bucket].push(triaged);
  }

  for (const bucketName of Object.keys(buckets)) {
    buckets[bucketName].sort((a, b) => {
      if (b.confidence !== a.confidence) return b.confidence - a.confidence;
      const aTime = a.createdAt ? Date.parse(a.createdAt) : 0;
      const bTime = b.createdAt ? Date.parse(b.createdAt) : 0;
      return bTime - aTime;
    });
  }

  return buckets;
}

function printSummary(summary) {
  console.log("Starter CI triage summary (informational only)");
  console.log(`Repo: ${summary.repo || "(unknown)"} | PR: ${summary.prNumber ?? "(unknown)"}`);
  console.log(`Status: ${summary.status}`);

  if (summary.warnings.length) {
    console.log("Warnings:");
    for (const warning of summary.warnings) {
      console.log(`- ${warning}`);
    }
  }

  const c = summary.counts;
  console.log(
    `Fetched ${c.rawReviews} reviews + ${c.rawComments} review comments; ` +
      `bot-candidate items: ${c.botCandidates}; triaged: ${c.triaged}`,
  );
  console.log(
    `Buckets: fix-now=${c.fixNow}, make-issue=${c.makeIssue}, ignore=${c.ignore}`,
  );

  if (!summary.counts.triaged) {
    console.log("No likely bot review feedback matched the starter filters.");
    return;
  }

  for (const [bucketName, items] of Object.entries(summary.buckets)) {
    if (!items.length) continue;
    console.log(`\n${bucketName}:`);
    for (const item of items.slice(0, MAX_PER_BUCKET_STDOUT)) {
      const loc = item.path ? ` (${item.path}${item.line ? `:${item.line}` : ""})` : "";
      const state = item.state ? ` [${item.state}]` : "";
      const link = item.url ? ` ${item.url}` : "";
      console.log(
        `- ${(item.confidence * 100).toFixed(0)}% ${item.author.login} ${item.kind}${state}${loc}: ${item.excerpt}${link}`,
      );
    }
    if (items.length > MAX_PER_BUCKET_STDOUT) {
      console.log(`- ... ${items.length - MAX_PER_BUCKET_STDOUT} more`);
    }
  }
}

async function main() {
  const repo = env("REPO", env("GITHUB_REPOSITORY"));
  const prNumber = toPrNumber(env("PR_NUMBER"));
  const token = env("GITHUB_TOKEN");
  const apiBase = env("GITHUB_API_URL", "https://api.github.com");
  const serverUrl = env("GITHUB_SERVER_URL", "https://github.com");
  const outputPath = env("TRIAGE_OUTPUT_PATH", "artifacts/ci-triage-summary.json");

  const summary = {
    generatedAt: new Date().toISOString(),
    starterPipeline: true,
    note: "Starter triage pipeline; not the final Codex-decider system.",
    repo,
    prNumber,
    status: "ok",
    warnings: [],
    counts: {
      rawReviews: 0,
      rawComments: 0,
      botCandidates: 0,
      triaged: 0,
      fixNow: 0,
      makeIssue: 0,
      ignore: 0,
    },
    buckets: {
      "fix-now": [],
      "make-issue": [],
      ignore: [],
    },
    metadata: {
      apiBase,
      outputPath,
    },
  };

  if (!repo || !repoParts(repo)) {
    summary.status = "skipped_missing_repo";
    summary.warnings.push("Missing repo context (REPO or GITHUB_REPOSITORY).");
    const written = await writeSummary(outputPath, summary);
    summary.metadata.outputPath = written;
    printSummary(summary);
    return;
  }

  if (!prNumber) {
    summary.status = "skipped_missing_pr";
    summary.warnings.push("Missing or invalid PR number (PR_NUMBER).");
    const written = await writeSummary(outputPath, summary);
    summary.metadata.outputPath = written;
    printSummary(summary);
    return;
  }

  if (!token) {
    summary.status = "skipped_missing_token";
    summary.warnings.push("Missing GITHUB_TOKEN; unable to call GitHub API.");
    const written = await writeSummary(outputPath, summary);
    summary.metadata.outputPath = written;
    printSummary(summary);
    return;
  }

  const headers = buildHeaders(token);
  const encodedRepo = repo
    .split("/")
    .map((part) => encodeURIComponent(part))
    .join("/");

  const reviewsUrl = `${apiBase}/repos/${encodedRepo}/pulls/${prNumber}/reviews`;
  const commentsUrl = `${apiBase}/repos/${encodedRepo}/pulls/${prNumber}/comments`;

  const [reviewsRes, commentsRes] = await Promise.all([
    fetchPaginatedJson({ url: reviewsUrl, headers }),
    fetchPaginatedJson({ url: commentsUrl, headers }),
  ]);

  if (!reviewsRes.ok) {
    summary.status = "partial_or_failed_fetch";
    summary.warnings.push(
      `Could not fetch reviews (${reviewsRes.status} ${reviewsRes.statusText}). ${reviewsRes.bodySnippet}`,
    );
  }
  if (!commentsRes.ok) {
    summary.status = "partial_or_failed_fetch";
    summary.warnings.push(
      `Could not fetch review comments (${commentsRes.status} ${commentsRes.statusText}). ${commentsRes.bodySnippet}`,
    );
  }

  const normalizedReviews = (reviewsRes.items || []).map((r) =>
    normalizeReview(r, { repo, prNumber, serverUrl }),
  );
  const normalizedComments = (commentsRes.items || []).map(normalizeComment);

  summary.counts.rawReviews = normalizedReviews.length;
  summary.counts.rawComments = normalizedComments.length;

  const botCandidates = [...normalizedReviews, ...normalizedComments].filter(looksLikeTargetBot);
  summary.counts.botCandidates = botCandidates.length;

  if (!botCandidates.length && summary.status === "ok") {
    summary.status = "no_matching_bot_feedback";
  }

  const triagedBuckets = triageItems(botCandidates);
  summary.buckets = triagedBuckets;
  summary.counts.fixNow = triagedBuckets["fix-now"].length;
  summary.counts.makeIssue = triagedBuckets["make-issue"].length;
  summary.counts.ignore = triagedBuckets.ignore.length;
  summary.counts.triaged =
    summary.counts.fixNow + summary.counts.makeIssue + summary.counts.ignore;

  if (summary.status === "partial_or_failed_fetch" && summary.counts.triaged === 0) {
    summary.warnings.push(
      "Starter triage summary may be incomplete because one or more API calls failed.",
    );
  }

  const written = await writeSummary(outputPath, summary);
  summary.metadata.outputPath = written;
  printSummary(summary);
}

main().catch(async (error) => {
  const outputPath = env("TRIAGE_OUTPUT_PATH", "artifacts/ci-triage-summary.json");
  const fallbackSummary = {
    generatedAt: new Date().toISOString(),
    starterPipeline: true,
    note: "Starter triage pipeline; not the final Codex-decider system.",
    repo: env("REPO", env("GITHUB_REPOSITORY")),
    prNumber: toPrNumber(env("PR_NUMBER")),
    status: "script_error",
    warnings: [summarizeText(error?.stack || error?.message || String(error), 800)],
    counts: {
      rawReviews: 0,
      rawComments: 0,
      botCandidates: 0,
      triaged: 0,
      fixNow: 0,
      makeIssue: 0,
      ignore: 0,
    },
    buckets: {
      "fix-now": [],
      "make-issue": [],
      ignore: [],
    },
    metadata: {
      outputPath,
    },
  };

  try {
    const written = await writeSummary(outputPath, fallbackSummary);
    fallbackSummary.metadata.outputPath = written;
  } catch {
    // Best effort only; pipeline is informational and should remain non-blocking.
  }

  printSummary(fallbackSummary);
  process.exitCode = 0;
});
