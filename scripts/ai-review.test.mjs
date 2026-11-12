import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { clipDiff, commentDestination, reviewDecision, reviewPrompt } from "./ai-review.mjs";

describe("ai review", () => {
  it("skips when the key is missing and reviews when it is set", () => {
    assert.equal(reviewDecision({}).action, "skip");
    assert.equal(reviewDecision({ XAI_API_KEY: "  " }).action, "skip");
    assert.equal(reviewDecision({ XAI_API_KEY: "xai-test" }).action, "review");
  });

  it("clips a huge diff and keeps a short one", () => {
    assert.equal(clipDiff("small"), "small");
    const huge = "a".repeat(20_000);
    const clipped = clipDiff(huge);
    assert.equal(clipped.endsWith("[diff truncated]"), true);
    assert.equal(clipped.length < huge.length, true);
  });

  it("comments on Origin when there is a pull request and prints when the CLI is missing", () => {
    assert.equal(commentDestination({ PR_NUMBER: "8" }, { originAvailable: true }), "origin");
    assert.equal(commentDestination({ PR_NUMBER: "8" }, { originAvailable: false }), "stdout");
    assert.equal(commentDestination({}, { originAvailable: true }), "stdout");
  });

  it("asks for meeting-safety bugs rather than style notes", () => {
    const prompt = reviewPrompt("diff --git a/share.ts");
    assert.match(prompt, /privacy|crisis|meeting/i);
    assert.match(prompt, /diff --git a\/share.ts/);
  });
});
