# Authorization Design

This reference owns the cross-language authorization decisions: which access-control model, where enforcement lives, and what the policies must guarantee. Framework wiring belongs to the language skills, client-side concerns to the react-core skill's security reference, and dependency auditing to the deps-core skill.

## The model ladder

Start with RBAC plus resource ownership, and stay there until a written policy forces you further. Permissions are data — rows like `document:delete` in a permissions table — and roles are named bundles of permissions; users hold roles, but call sites check permissions. That split makes a new or reshuffled role a data change instead of a deployment. Ownership covers most of the rest: the majority of real checks are "does this row belong to this user or this org", which is exactly what row-level security enforces below.

Escalate past RBAC only when access genuinely depends on runtime attributes (time, resource state, relationships between users) — and then adopt an engine rather than writing one.

## Never hand-roll a policy engine

Hard rule. Hand-rolled attribute evaluators fail in two characteristic ways:

- **Undefined attributes evaluate to allow.** A policy compares an attribute the request never carried; the comparison against null/undefined "passes" (or throws into a permissive code path) and the request sails through. In a policy engine an absent attribute must be an explicit deny, and hand-rolled code gets this wrong again at every newly added attribute.
- **First-match evaluation makes deny unreachable.** Evaluators that return on the first matching policy let a broad allow early in the list shadow every deny after it. Deny must win regardless of ordering — a property that has to be designed in, not patched in.

Maintained engines, registry-verified: OPA (policy-as-code in Rego, external decision point), Casbin (`casbin` on npm and PyPI, in-process, model-file driven), and OpenFGA (`@openfga/sdk`, relationship-based authorization). Do not adopt the open-source oso library — it is dormant; Oso's maintained offering is the hosted oso-cloud client.

## Row-level security: the house multi-tenant pattern

Tenant isolation is enforced in Postgres itself; Supabase's helpers make that the default posture.

**Enable, then force.** `enable row level security` turns policies on; an enabled table with no policies default-denies everything. `force row level security` closes the remaining gap: the table owner otherwise bypasses their own policies, and migrations, jobs, and ORM connections often run as the owner. Superusers and roles with the `BYPASSRLS` attribute always bypass — Supabase's secret key (and the legacy service_role key) runs as such a role, skips every policy, and must never reach client-side code.

**`using` vs `with check`, per verb.** `using` decides which existing rows a statement can see or touch; `with check` decides which new or modified rows it may write. `select` and `delete` policies take only `using`, `insert` only `with check`, `update` both.

**Permissive OR, restrictive AND.** PERMISSIVE policies (the default) OR together, so adding one can only widen access. RESTRICTIVE policies AND with everything else. Tenant isolation therefore goes in a restrictive policy: no permissive policy added later can leak across tenants.

**Helper functions: `security definer set search_path = ''`.** Definer functions run with their owner's privileges, and an unpinned search_path lets anyone who can create objects in an earlier schema shadow a referenced table or function and have their code run with those privileges. An empty search_path plus schema-qualified names closes that; keep the helpers in a schema the API does not expose.

**Wrap `auth.uid()` as `(select auth.uid())`.** The subquery becomes an initPlan the planner caches once per statement instead of re-evaluating per row. Index every column the policies filter on.

The pattern, executed end to end against PostgreSQL 15 (cross-tenant reads returned nothing, cross-tenant and owner-spoofed inserts were rejected, and the forced table owner saw zero rows):

```sql
alter table documents enable row level security;
alter table documents force row level security;    -- the owner is subject too

create function app.is_org_member(org uuid)
returns boolean
language sql stable
security definer set search_path = ''
as $$
  select exists (
    select 1 from app.memberships m
    where m.org_id = org and m.user_id = (select auth.uid())
  );
$$;

-- Tenant isolation: RESTRICTIVE, so it ANDs with every policy below.
create policy tenant_isolation on documents
  as restrictive
  using (app.is_org_member(org_id));

-- Per-verb PERMISSIVE policies; these OR together within a verb.
create policy doc_select on documents for select
  using (true);                                    -- already bounded by tenant_isolation
create policy doc_insert on documents for insert
  with check (owner_id = (select auth.uid()));
create policy doc_update on documents for update
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));
create policy doc_delete on documents for delete
  using (owner_id = (select auth.uid()));
```

`documents` carries `org_id` and `owner_id`; `app.memberships` maps users to orgs and gets RLS of its own. Grant the app role `execute` on the helper.

## The database is the floor

Enforce at the data layer and mirror the same rules in the API layer. The API check exists for fast failure and good error messages; the RLS policy is the guarantee that survives a buggy endpoint, an ad-hoc script, or a forgotten filter. When the two disagree, the database is right and the API has a bug.

## Boundaries

deps-core owns auditing the dependencies named here; react-core's security reference owns everything client-side — nothing the browser renders or hides is an authorization control.
