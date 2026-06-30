# Matrix Room And User Lifecycle Design Before Integration

Version: 2026-06-30

Task ID: MCR-920

## Purpose

This is design only. It authorizes no production homeserver setup, AppService
deployment, room or user automation code, real Matrix send path, Runtime
service, DB work, Codex execution, GitHub write, deploy, live memory write,
merge, push, or production main write.

MCR-720 remains a local disposable compatibility proof for one AppService
transaction. It does not prove production Matrix readiness, persistent Runtime
operation, room lifecycle automation, user lifecycle automation, or real
projection delivery.

## Source Of Truth

Matrix is a collaboration entrance, approval surface, and projection timeline.
Matrix is not the Runtime source of truth.

Runtime owns:

- workspace to room bindings;
- task state and transition history;
- actor and approval identity bindings;
- policy decisions and authorization results;
- idempotency records for transactions, events, commands, and projections;
- proof, approval, artifact, cleanup, and revocation refs.

The gateway may read Matrix transaction metadata and room membership facts as
input evidence, but Runtime state decides whether an event can create work,
approve work, deny work, or receive a projection.

## Room Lifecycle

Runtime owns a room binding record:

```text
room_id
-> workspace_id
-> purpose
-> allowed inbound event types
-> allowed projection event types
-> lifecycle state
-> cleanup refs
```

The first production design should keep purposes small:

- `workspace_intake`: accepts task request events for one workspace.
- `task_thread`: optional per-task collaboration room or thread if the Matrix
  deployment supports it cleanly.
- `operator_incident`: receives security, cleanup, and unmapped-room incidents.

Do not create task rooms by default. Use a workspace intake room plus Runtime
task ids until repeated task conversations prove that per-task rooms or threads
are needed.

Room states:

- `pending`: Runtime has planned the binding, but the room is not trusted for
  intake.
- `active`: Runtime has verified the room id, workspace, bot membership,
  allowed event types, and membership policy.
- `archived`: Runtime accepts no new task requests; projections may be limited
  to final archive notices.
- `revoked`: Runtime accepts no inbound events and sends no routine
  projections.

Unknown rooms are deny-by-default. They must not enqueue Runtime task work, even
if event content claims a known `workspace_id`.

Duplicate Matrix transactions and events remain separate idempotency inputs.
Future durable idempotency must record accepted, rejected, duplicate, incident,
and projection outcomes before returning a non-retryable homeserver response.

## Membership And Invitation Model

Runtime policy decides who should be in a workspace room. Matrix room membership
is evidence, not authority by itself.

Minimal model:

- A Runtime-managed AppService or bot identity joins mapped rooms only.
- Human users may request tasks only after their Matrix user id is bound to a
  Runtime actor for that workspace.
- Invitations are allowed only from Runtime-authorized operators or an
  approved provisioning path.
- The bot must not auto-join arbitrary invites from unknown rooms or unknown
  users.
- If Matrix membership and Runtime membership disagree, Runtime fails closed and
  emits an incident ref instead of creating task work.

Future automation may create or invite rooms only after a dedicated task adds
contracts, fixtures, cleanup proof, disposable credentials, and one approved
manual run. MCR-920 does not authorize that code.

## User And Provenance Model

Matrix sender and Runtime actor are different identities.

```text
Matrix sender: @user:server from the homeserver event
Runtime actor: Runtime-owned identity after workspace membership and policy
approval
claimed actor: content.actor or any body-level actor claim
```

Inbound authority must derive from:

1. homeserver authentication;
2. `room_id` to Runtime workspace binding;
3. Matrix `sender`;
4. Runtime actor binding for that sender and workspace;
5. Runtime policy for the requested action.

`content.actor` is provenance only. It cannot grant human, owner, verifier,
admin, system, worker, AppService, or approval authority.

AppService and bot identities are system actors for projection transport only.
They must not approve, deny, request work as humans, or satisfy proof gates.

Human approval identity binding requires:

- Matrix sender id;
- Runtime actor id;
- workspace id;
- allowed approval action scope;
- proof id being approved or denied;
- binding creation and revocation refs.

Approval replay is denied unless the approval id, proof id, action scope,
target ref, actor binding, and expiry still match Runtime state.

## Permission Model

Default decision is deny.

Allowed permissions are action-scoped:

- create task requests: bound workspace members with task-request permission in
  an active workspace intake room.
- approve or deny: bound human approvers for the exact action scope and proof
  id.
- view projections: users allowed by Matrix room membership and Runtime
  workspace projection policy.
- operator incident view: operators for the workspace or deployment.
- room/archive/revoke administration: Runtime operators only, behind a future
  approved provisioning path.

Unknown rooms, unknown users, unbound Matrix senders, mismatched workspaces,
unsupported event types, spoofed actor claims, bot-originated approval attempts,
and projection events submitted inbound from Matrix are denied or recorded as
incidents. They must not mutate Runtime task state.

## Projection Rules

Runtime may project only bounded summaries that already exist in Runtime state
or verified proof:

- task accepted or rejected summary;
- worker progress summary without raw output;
- artifact reference with hash, size, kind, and URI;
- proof submitted or verification completed summary;
- approval requested, granted, or denied summary;
- memory proposal reference, not memory body;
- incident summary;
- archive, cleanup, or revocation summary.

Runtime must never project raw:

- Matrix event bodies or room history;
- worker stdout, stderr, logs, validation logs, or Codex JSONL;
- raw diffs, patches, PR bodies, review bodies, or large generated files;
- token values, env dumps, secret names with values, DB URLs, private keys, or
  credential material;
- live memory bodies or applied memory content;
- external API request or response bodies.

Projection idempotency keys are Runtime-owned. A duplicate projection request
must return the original projection result ref or no-op result, not send another
Matrix event.

Inbound Matrix attempts to submit Runtime-owned projection event types are not
Runtime facts. They are rejected input or incidents.

## Cleanup And Revocation Proof

Future real Matrix integration must prove cleanup and revocation with refs, not
claims.

Minimum proof refs for each approved disposable or production-like run:

- mapped room ids, aliases, and lifecycle state changes;
- bot/AppService user ids and namespace or registration ids;
- invite, join, leave, archive, kick, or ban command summaries;
- credential generation scope and revocation/deletion summary without values;
- homeserver/AppService listener stop proof when local disposable services are
  used;
- post-cleanup checks for no generated files, no disposable listeners, no stale
  registrations, and no active mapped disposable rooms;
- incidents for resources that could not be cleaned up.

Runtime cleanup records must stay ref-only. Do not store raw Matrix room
history, raw homeserver logs, generated registration bodies with token values,
or access tokens.

## Migration And Implementation Gate

No Matrix room/user implementation task may start until all of this is true:

- MCR-920 is accepted as a design artifact.
- The next task has a narrow allowlist for docs, schemas, fixtures, and
  contract tests first.
- Any code task names its exact allowed files and keeps production homeserver,
  AppService deployment, real send path, DB, Codex, GitHub, deploy, and live
  memory out of scope unless separately approved.
- Matrix room/user contracts cover unknown room, unknown user, unbound sender,
  spoofed actor, bot approval attempt, duplicate transaction, duplicate event,
  duplicate projection, cleanup failure, and revocation.
- Disposable credentials and resources are named with one run id.
- A one-run proof plan records command summaries, refs, cleanup, revocation,
  and rollback without secret values.
- MCR-720 remains compatibility proof only and is not reused as production
  readiness evidence.

The first later implementation slice should be contracts and fixtures for
Runtime-owned room/user binding decisions. Room creation, invites, membership
automation, and real Matrix send should wait until those contracts pass.

## Future Implementation Proof

A later implementation must prove:

- unknown rooms and users are denied by default;
- Matrix sender is mapped to Runtime actor before authority is granted;
- `content.actor` spoofing cannot grant authority;
- bot/AppService identities cannot approve human-gated actions;
- duplicate transaction, event, and projection keys are idempotent;
- projection payloads reject raw logs, diffs, tokens, env, Matrix bodies, and
  live memory bodies;
- cleanup and revocation evidence is captured without storing secret values;
- `pnpm test:contracts`, `pnpm schemas:validate`, package tests, and
  `git diff --check` pass.

This design does not claim production readiness.
