import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";
import worker, { buildMatchAssignments } from "../worker/index.js";

class TestStatement {
  constructor(database, sql) { this.database = database; this.sql = sql; this.params = []; }
  bind(...params) { this.params = params; return this; }
  async first() { return this.database.prepare(this.sql).get(...this.params) || null; }
  async all() { return { results: this.database.prepare(this.sql).all(...this.params) }; }
  async run() { return { success: true, meta: this.database.prepare(this.sql).run(...this.params) }; }
}

async function createTestEnv() {
  const database = new DatabaseSync(":memory:");
  database.exec("PRAGMA foreign_keys = ON");
  const migration = await readFile(new URL("../drizzle/0000_loose_shocker.sql", import.meta.url), "utf8");
  for (const statement of migration.split("--> statement-breakpoint").map((item) => item.trim()).filter(Boolean)) database.exec(statement);
  const DB = {
    prepare: (sql) => new TestStatement(database, sql),
    batch: async (statements) => Promise.all(statements.map((statement) => statement.run())),
  };
  return { DB, database, HOST_TOKEN: "host-test-token" };
}

function apiRequest(path, { method = "GET", body, hostToken, participantToken } = {}) {
  return new Request(`https://example.test${path}`, {
    method,
    headers: {
      ...(body ? { "content-type": "application/json" } : {}),
      ...(hostToken ? { authorization: `Bearer ${hostToken}` } : {}),
      ...(participantToken ? { "x-participant-token": participantToken } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
}

test("serves existing static assets without a fallback", async () => {
  const calls = [];
  const response = await worker.fetch(new Request("https://example.test/assets/app.js"), {
    ASSETS: {
      fetch: async (request) => {
        calls.push(new URL(request.url).pathname);
        return new Response("asset", { status: 200 });
      },
    },
  });

  assert.equal(response.status, 200);
  assert.deepEqual(calls, ["/assets/app.js"]);
});

test("falls back to index.html for an unknown app route", async () => {
  const calls = [];
  const response = await worker.fetch(
    new Request("https://example.test/flow/step-two?source=share", {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async (request) => {
          const url = new URL(request.url);
          calls.push(url.pathname + url.search);
          return new Response(url.pathname === "/index.html" ? "app" : "missing", {
            status: url.pathname === "/index.html" ? 200 : 404,
          });
        },
      },
    },
  );

  assert.equal(response.status, 200);
  assert.deepEqual(calls, ["/flow/step-two?source=share", "/index.html"]);
});

test("does not turn API routes into the app shell", async () => {
  const response = await worker.fetch(new Request("https://example.test/api/missing"), {});
  assert.equal(response.status, 503);
  assert.match((await response.json()).error, /資料庫/);
});

test("creates real participants, protects host data, and produces round matches", async () => {
  const env = await createTestEnv();
  const people = [
    { id: "person-alpha", token: "alpha-secret", nickname: "光子", role: "mechanic", skills: ["AI"] },
    { id: "person-bravo", token: "bravo-secret", nickname: "小璐", role: "illusionist", skills: ["設計"] },
  ];

  for (const person of people) {
    const response = await worker.fetch(apiRequest("/api/participants", {
      method: "POST",
      participantToken: person.token,
      body: { ...person, wall: true, match: true },
    }), env);
    assert.equal(response.status, 200);
    assert.equal((await response.json()).nickname, person.nickname);
  }

  assert.equal((await worker.fetch(apiRequest("/api/host/participants"), env)).status, 403);
  const listResponse = await worker.fetch(apiRequest("/api/host/participants", { hostToken: env.HOST_TOKEN }), env);
  assert.equal(listResponse.status, 200);
  assert.equal((await listResponse.json()).participants.length, 2);

  const startResponse = await worker.fetch(apiRequest("/api/host/event", {
    method: "POST", hostToken: env.HOST_TOKEN, body: { mode: "countdown", durationSeconds: 5 },
  }), env);
  assert.equal((await startResponse.json()).mode, "countdown");
  env.database.prepare("UPDATE event_state SET ends_at = 0 WHERE id = 1").run();

  const completeResponse = await worker.fetch(apiRequest("/api/host/complete-round", { method: "POST", hostToken: env.HOST_TOKEN }), env);
  const completed = await completeResponse.json();
  assert.equal(completed.mode, "matched");
  assert.equal(completed.matchCount, 2);

  const matchResponse = await worker.fetch(apiRequest(`/api/matches/me?participantId=${people[0].id}`, { participantToken: people[0].token }), env);
  const match = (await matchResponse.json()).match;
  assert.equal(match.id, people[1].id);
  assert.notEqual(match.id, people[0].id);
});

test("match assignment gives every eligible participant exactly one different target", () => {
  const assignments = buildMatchAssignments(["a", "b", "c"], () => 0.4);
  assert.equal(assignments.length, 3);
  assert.deepEqual(new Set(assignments.map((item) => item.participantId)), new Set(["a", "b", "c"]));
  assert.ok(assignments.every((item) => item.participantId !== item.targetId));
});

test("emits the files required by Sites packaging", async () => {
  await access(new URL("../dist/client/index.html", import.meta.url));
  await access(new URL("../dist/server/index.js", import.meta.url));
  await access(new URL("../dist/.openai/hosting.json", import.meta.url));
  await access(new URL("../dist/.openai/drizzle/0000_loose_shocker.sql", import.meta.url));
});
