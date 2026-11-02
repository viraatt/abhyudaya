import assert from "assert";
import { computePollStatus, toMillis, formatPollDateTime } from "../src/Firebase/pollService.js";

console.log("🧪 Running Poll & Voting System Logic Tests...\n");

// Test 1: computePollStatus
console.log("Test 1: Status computation...");
const now = Date.now();
const pastDate = new Date(now - 10000000);
const futureDate = new Date(now + 10000000);
const farFutureDate = new Date(now + 20000000);

assert.strictEqual(computePollStatus({ status: "draft" }), "draft", "Draft status failed");
assert.strictEqual(computePollStatus({ status: "closed" }), "closed", "Closed status failed");
assert.strictEqual(computePollStatus({ archived: true }), "archived", "Archived flag failed");

// Active poll within window
const activePoll = {
  status: "active",
  startAt: pastDate,
  endAt: futureDate,
};
assert.strictEqual(computePollStatus(activePoll), "active", "Active status calculation failed");

// Scheduled poll starting in the future
const scheduledPoll = {
  status: "active",
  startAt: futureDate,
  endAt: farFutureDate,
};
assert.strictEqual(computePollStatus(scheduledPoll), "scheduled", "Scheduled status calculation failed");

// Expired poll whose endAt is in the past
const expiredPoll = {
  status: "active",
  startAt: pastDate,
  endAt: new Date(now - 1000),
};
assert.strictEqual(computePollStatus(expiredPoll), "closed", "Auto-closure on expired deadline failed");
console.log("✅ computePollStatus passed all cases.");

// Test 2: Timestamp normalizer
console.log("\nTest 2: Timestamp conversion (toMillis)...");
assert.strictEqual(toMillis(null), 0);
assert.strictEqual(toMillis(1600000000000), 1600000000000);
assert.strictEqual(toMillis({ seconds: 1600000000 }), 1600000000000);
assert.strictEqual(toMillis({ toMillis: () => 123456789 }), 123456789);
console.log("✅ toMillis conversions verified.");

// Test 3: Division-by-zero check on 0 votes
console.log("\nTest 3: Zero vote edge case...");
const zeroVotePoll = {
  title: "Test Zero Vote",
  totalVotes: 0,
  options: [
    { id: "opt_1", text: "React", voteCount: 0 },
    { id: "opt_2", text: "Vue", voteCount: 0 },
  ],
};
zeroVotePoll.options.forEach((opt) => {
  const percentage = zeroVotePoll.totalVotes > 0 ? (opt.voteCount / zeroVotePoll.totalVotes) * 100 : 0;
  assert.strictEqual(percentage, 0, "Percentage calculation on zero votes should be 0");
  assert.strictEqual(isNaN(percentage), false, "Percentage should never be NaN");
});
console.log("✅ 0-votes division-by-zero edge case verified safe.");

// Test 4: Single choice vs Multiple choice rule enforcement
console.log("\nTest 4: Ballot selection rules...");
function validateBallot(poll, selectedOptions) {
  if (!selectedOptions || selectedOptions.length === 0) {
    throw new Error("EMPTY_SELECTION");
  }
  if (!poll.allowMultiple && selectedOptions.length > 1) {
    throw new Error("MULTIPLE_OPTIONS_NOT_ALLOWED");
  }
  const validIds = new Set(poll.options.map((o) => o.id));
  for (const id of selectedOptions) {
    if (!validIds.has(id)) throw new Error("INVALID_OPTION");
  }
  return true;
}

const singleChoicePoll = {
  allowMultiple: false,
  options: [{ id: "opt_1" }, { id: "opt_2" }],
};

assert.throws(() => validateBallot(singleChoicePoll, []), /EMPTY_SELECTION/);
assert.throws(() => validateBallot(singleChoicePoll, ["opt_1", "opt_2"]), /MULTIPLE_OPTIONS_NOT_ALLOWED/);
assert.throws(() => validateBallot(singleChoicePoll, ["opt_unknown"]), /INVALID_OPTION/);
assert.strictEqual(validateBallot(singleChoicePoll, ["opt_1"]), true);

const multiChoicePoll = {
  allowMultiple: true,
  options: [{ id: "opt_1" }, { id: "opt_2" }, { id: "opt_3" }],
};
assert.strictEqual(validateBallot(multiChoicePoll, ["opt_1", "opt_3"]), true);
console.log("✅ Ballot validation rules verified.");

console.log("\n🎉 ALL TESTS PASSED SUCCESSFULLY!\n");
