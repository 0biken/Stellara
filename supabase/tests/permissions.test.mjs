import assert from "node:assert/strict";
import { test } from "node:test";
import { canStaff, staffRoles } from "../functions/_shared/permissions.js";
import { adminAction } from "../functions/_shared/admin.js";

test("only super admin can assign staff roles", () => {
  for (const role of staffRoles)
    assert.equal(canStaff(role, "staff.manage"), role === "super_admin");
});
test("admin handler refuses guardians before reading protected operations", async () => {
  let calls = 0;
  const sql = async () => {
    calls++;
    return [];
  };
  await assert.rejects(
    adminAction(sql, { id: "guardian" }, { action: "operations" }),
    /STAFF_FORBIDDEN/,
  );
  assert.equal(calls, 1);
});
test("support lookup requires a recorded reason before querying a child", async () => {
  let calls = 0;
  const sql = async () => {
    calls++;
    return [{ role: "admin" }];
  };
  await assert.rejects(
    adminAction(
      sql,
      { id: "staff" },
      { action: "support", child_id: "00000000-0000-4000-8000-000000000001", reason: "" },
    ),
    /INVALID_REQUEST/,
  );
  assert.equal(calls, 1);
});
test("admin cannot change staff and super admin cannot disable itself", async () => {
  for (const role of ["admin", "super_admin"]) {
    let calls = 0;
    const sql = async () => {
      calls++;
      return [{ role }];
    };
    await assert.rejects(
      adminAction(
        sql,
        { id: "00000000-0000-4000-8000-000000000001" },
        {
          action: "staff-set",
          user_id: "00000000-0000-4000-8000-000000000001",
          role: "admin",
          active: false,
        },
      ),
      /STAFF_FORBIDDEN/,
    );
    assert.ok(calls <= 2);
  }
});
test("content roles cannot inspect families and operations cannot publish", () => {
  for (const role of ["author", "reviewer", "content_lead"])
    assert.equal(canStaff(role, "support.read"), false);
  assert.equal(canStaff("admin", "content.publish"), false);
  assert.equal(canStaff("author", "content.review"), false);
  assert.equal(canStaff("reviewer", "content.write"), false);
  for (const role of ["guardian", "child", "__proto__", "constructor", ""])
    assert.equal(canStaff(role, "staff.manage"), false);
});

test("super admin cannot change itself using an uppercase UUID", async () => {
  const userId = "abcdef01-2345-4678-89ab-cdef01234567";
  let calls = 0;
  const sql = async () => {
    calls++;
    return [{ role: "super_admin" }];
  };
  sql.json = (value) => value;
  await assert.rejects(
    adminAction(
      sql,
      { id: userId },
      {
        action: "staff-set",
        user_id: userId.toUpperCase(),
        role: "admin",
        active: false,
      },
    ),
    /STAFF_FORBIDDEN/,
  );
  assert.equal(calls, 2, "reject before any staff mutation or audit insert");
});

test("staff assignments normalize the target UUID in mutations and audit records", async () => {
  const targetId = "abcdef01-2345-4678-89ab-cdef01234567";
  const queries = [];
  const sql = async (parts, ...values) => {
    queries.push({ text: parts.join("?"), values });
    return [{ role: "super_admin" }];
  };
  sql.json = (value) => value;
  assert.deepEqual(
    await adminAction(
      sql,
      { id: "00000000-0000-4000-8000-000000000001" },
      {
        action: "staff-set",
        user_id: targetId.toUpperCase(),
        role: "author",
        active: true,
      },
    ),
    { ok: true },
  );
  const mutation = queries.find((query) =>
    query.text.includes("insert into stellara_private.staff_members"),
  );
  const audit = queries.find((query) =>
    query.text.includes("insert into stellara_private.audit_log"),
  );
  assert.equal(mutation.values[0], targetId);
  assert.equal(audit.values[4], targetId);
});
