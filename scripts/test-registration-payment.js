import assert from "node:assert/strict";
import handler, { setDb } from "../server/registrations/create.js";

console.log("🧪 Running Regression Tests: Vulnerability 2 (Event Registration Payment Bypass)...\n");

/**
 * Creates an in-memory mock Firestore database for unit testing.
 */
function createMockFirestore({ events = {}, registrations = [] } = {}) {
  const eventDocs = new Map(Object.entries(events));
  const registrationDocs = [...registrations];

  const db = {
    collection(name) {
      if (name === "events") {
        return {
          doc(id) {
            return {
              id,
              async get() {
                const data = eventDocs.get(id);
                return {
                  exists: Boolean(data),
                  data: () => data,
                };
              },
            };
          },
        };
      }

      if (name === "registrations") {
        return {
          doc(id = `reg_doc_${Date.now()}_${Math.random()}`) {
            return { id };
          },
          where(field, op, value) {
            return {
              where(field2, op2, value2) {
                return {
                  limit(n) {
                    return {
                      async get() {
                        const filtered = registrationDocs.filter(
                          (r) => r[field] === value && r[field2] === value2
                        );
                        return {
                          empty: filtered.length === 0,
                          docs: filtered.slice(0, n).map((d) => ({
                            data: () => d,
                          })),
                        };
                      },
                    };
                  },
                };
              },
              async get() {
                const filtered = registrationDocs.filter((r) => r[field] === value);
                return {
                  empty: filtered.length === 0,
                  docs: filtered.map((d) => ({
                    data: () => d,
                  })),
                };
              },
            };
          },
        };
      }

      throw new Error(`Unhandled collection: ${name}`);
    },

    async runTransaction(updateFunction) {
      const transaction = {
        async get(refOrQuery) {
          return refOrQuery.get();
        },
        set(ref, data) {
          registrationDocs.push({ id: ref.id, ...data });
        },
      };

      return updateFunction(transaction);
    },

    getRegisteredData: () => registrationDocs,
  };

  return db;
}

// Helper to create mock req/res
function createMockReqRes({ body = {}, method = "POST" } = {}) {
  let statusCode = 200;
  let responseData = null;

  const req = {
    method,
    headers: { "content-type": "application/json" },
    body,
  };

  const res = {
    status(code) {
      statusCode = code;
      return this;
    },
    json(data) {
      responseData = data;
      return this;
    },
    getStatus: () => statusCode,
    getData: () => responseData,
  };

  return { req, res };
}

// Test 1: An attacker cannot bypass payment for a paid event by sending isPaid: false
{
  const mockDb = createMockFirestore({
    events: {
      "paid-event-1": {
        title: "Hackathon 2026",
        status: "Published",
        registrationOpen: true,
        isPaid: true,
        feeAmount: 250,
      },
    },
  });
  setDb(mockDb);

  // Attacker attempts to register claiming event is free
  const { req, res } = createMockReqRes({
    body: {
      eventId: "paid-event-1",
      name: "Attacker User",
      email: "attacker@example.com",
      isPaid: false, // Malicious override attempt
      amount: 0,     // Malicious override attempt
      paymentStatus: "free", // Malicious override attempt
    },
  });

  await handler(req, res);

  assert.strictEqual(res.getStatus(), 201, "Registration should succeed and return 201");
  const responseData = res.getData();
  assert.strictEqual(responseData.success, true);
  assert.ok(responseData.registrationId, "Must return registrationId");

  const savedRecord = mockDb.getRegisteredData().find((r) => r.email === "attacker@example.com");
  assert.ok(savedRecord, "Registration must be stored in database");

  // Verify authoritative enforcement:
  assert.strictEqual(savedRecord.isPaid, true, "isPaid must be TRUE based on authoritative event, ignoring client isPaid: false");
  assert.strictEqual(savedRecord.amount, 250, "amount must be 250 from event.feeAmount, ignoring client amount: 0");
  assert.strictEqual(savedRecord.registrationStatus, "payment_pending", "Status must be payment_pending, NOT registered");
  assert.strictEqual(savedRecord.paymentStatus, "pending", "Payment status must be pending, NOT free");
  console.log("✓ Test 1 Passed: Client attempt to register paid event with isPaid: false authoritatively forced to payment_pending with fee.");
}

// Test 2: Genuinely free event is registered as free and confirmed immediately
{
  const mockDb = createMockFirestore({
    events: {
      "free-event-1": {
        title: "Open Tech Workshop",
        status: "Published",
        registrationOpen: true,
        isPaid: false,
        feeAmount: 0,
      },
    },
  });
  setDb(mockDb);

  const { req, res } = createMockReqRes({
    body: {
      eventId: "free-event-1",
      name: "Free Participant",
      email: "participant@example.com",
    },
  });

  await handler(req, res);

  assert.strictEqual(res.getStatus(), 201);
  const savedRecord = mockDb.getRegisteredData().find((r) => r.email === "participant@example.com");
  assert.strictEqual(savedRecord.isPaid, false);
  assert.strictEqual(savedRecord.amount, 0);
  assert.strictEqual(savedRecord.registrationStatus, "registered");
  assert.strictEqual(savedRecord.paymentStatus, "free");
  console.log("✓ Test 2 Passed: Genuinely free event registers normally with status 'registered' and 'free'.");
}

// Test 3: Invalid or inconsistent fee configuration is rejected
{
  const mockDb = createMockFirestore({
    events: {
      "broken-fee-event": {
        title: "Broken Fee Event",
        status: "Published",
        registrationOpen: true,
        isPaid: true,
        feeAmount: 0, // Inconsistent: marked paid but 0 fee
      },
    },
  });
  setDb(mockDb);

  const { req, res } = createMockReqRes({
    body: {
      eventId: "broken-fee-event",
      name: "Test User",
      email: "user@example.com",
    },
  });

  await handler(req, res);

  assert.strictEqual(res.getStatus(), 400);
  assert.strictEqual(res.getData().success, false);
  assert.ok(
    res.getData().error.includes("invalid registration fee configuration"),
    "Must return user-friendly invalid fee configuration error"
  );
  console.log("✓ Test 3 Passed: Inconsistent fee configuration (isPaid: true with 0 fee) safely rejected.");
}

// Test 4: Closed event cannot be registered for
{
  const mockDb = createMockFirestore({
    events: {
      "closed-event": {
        title: "Closed Summit",
        status: "Published",
        registrationOpen: false, // Closed
      },
    },
  });
  setDb(mockDb);

  const { req, res } = createMockReqRes({
    body: {
      eventId: "closed-event",
      name: "Late User",
      email: "late@example.com",
    },
  });

  await handler(req, res);

  assert.strictEqual(res.getStatus(), 400);
  assert.strictEqual(res.getData().error, "Registrations are currently closed for this event.");
  console.log("✓ Test 4 Passed: Closed event registration safely rejected.");
}

// Test 5: Duplicate registration prevention remains active
{
  const mockDb = createMockFirestore({
    events: {
      "dup-event": {
        title: "Exclusive Seminar",
        status: "Published",
        registrationOpen: true,
        isPaid: false,
      },
    },
    registrations: [
      {
        eventId: "dup-event",
        email: "alice@example.com",
        registrationStatus: "registered",
      },
    ],
  });
  setDb(mockDb);

  const { req, res } = createMockReqRes({
    body: {
      eventId: "dup-event",
      name: "Alice Again",
      email: "alice@example.com",
    },
  });

  await handler(req, res);

  assert.strictEqual(res.getStatus(), 400);
  assert.strictEqual(res.getData().error, "You are already registered for this event with this email.");
  console.log("✓ Test 5 Passed: Duplicate registration attempt rejected with ALREADY_REGISTERED.");
}

// Test 6: Capacity protection remains intact
{
  const mockDb = createMockFirestore({
    events: {
      "full-event": {
        title: "Limited Seat Workshop",
        status: "Published",
        registrationOpen: true,
        maxRegistrations: 2,
        isPaid: false,
      },
    },
    registrations: [
      { eventId: "full-event", email: "p1@example.com", registrationStatus: "registered" },
      { eventId: "full-event", email: "p2@example.com", registrationStatus: "registered" },
    ],
  });
  setDb(mockDb);

  const { req, res } = createMockReqRes({
    body: {
      eventId: "full-event",
      name: "Person 3",
      email: "p3@example.com",
    },
  });

  await handler(req, res);

  assert.strictEqual(res.getStatus(), 400);
  assert.strictEqual(res.getData().error, "This event has reached its maximum participant capacity.");
  console.log("✓ Test 6 Passed: Event capacity limit strictly enforced.");
}

// Reset Db back to default
setDb(null);

console.log("\n🎉 All 6 Vulnerability 2 Registration Payment Tests Passed Successfully!\n");
