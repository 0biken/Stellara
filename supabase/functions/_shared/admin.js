import { canStaff, staffRoles } from "./permissions.js";

export async function adminAction(sql, user, body) {
  // Role mutations and their authorization share one lock, including revocations.
  if (body.action === "staff-set") await sql`select pg_advisory_xact_lock(726035)`;
  const [member] =
    await sql`select role from stellara_private.staff_members where user_id=${user.id} and active`;
  const deny = () => {
    throw new Error("STAFF_FORBIDDEN");
  };
  if (!member) deny();
  const requirePermission = (permission) => {
    if (!canStaff(member.role, permission)) deny();
  };
  const audit = (action, entity, entityId, diff) => sql`insert into stellara_private.audit_log
    (actor_id,actor_role,action,entity,entity_id,diff)
    values (${user.id},${member.role},${action},${entity},${entityId},${sql.json(diff)})`;
  if (body.action === "session") return { role: member.role };
  if (body.action === "staff-list") {
    requirePermission("staff.manage");
    return sql`select user_id,role,active from stellara_private.staff_members order by user_id`;
  }
  if (body.action === "staff-set") {
    requirePermission("staff.manage");
    if (
      !staffRoles.includes(body.role) ||
      typeof body.active !== "boolean" ||
      typeof body.user_id !== "string" ||
      !/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(body.user_id ?? "")
    )
      throw new Error("INVALID_REQUEST");
    const targetId = body.user_id.toLowerCase();
    if (targetId === user.id.toLowerCase()) deny();
    await sql`insert into stellara_private.staff_members (user_id,role,active)
      values (${targetId},${body.role},${body.active})
      on conflict (user_id) do update set role=excluded.role,active=excluded.active`;
    await audit("staff-set", "staff_members", targetId, {
      role: body.role,
      active: body.active,
    });
    return { ok: true };
  }
  if (body.action === "operations") {
    requirePermission("operations.read");
    const requests =
      await sql`select kind,status,count(*)::int as count from public.data_requests group by kind,status`;
    return { requests };
  }
  if (body.action === "support") {
    requirePermission("support.read");
    if (
      typeof body.reason !== "string" ||
      body.reason.trim().length < 10 ||
      body.reason.length > 500 ||
      !/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(body.child_id ?? "")
    )
      throw new Error("INVALID_REQUEST");
    await audit("support-view", "children", body.child_id, { reason: body.reason.trim() });
    const [child] =
      await sql`select id,first_name,year,status from public.children where id=${body.child_id}`;
    const requests =
      await sql`select id,kind,status,requested_at,due_at from public.data_requests where child_id=${body.child_id}`;
    return { child: child ?? null, requests };
  }
  if (body.action === "audit") {
    requirePermission("audit.read");
    return sql`select id,actor_id,actor_role,action,entity,entity_id,created_at from stellara_private.audit_log order by created_at desc limit 100`;
  }
  throw new Error("INVALID_REQUEST");
}
