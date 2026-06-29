# MCR-720 Disposable Synapse Scaffold

Status: manual-only, disposable, no secrets, no default service start.

This directory is scaffold/docs only for a future human-approved Matrix-only
smoke. Do not start Docker or Synapse as part of this scaffold review.

## Files

- `docker-compose.yaml`: local-only Synapse service behind the `manual` profile.
- `homeserver.example.yaml`: example config with placeholder-only values and no
  real secrets.
- `appservice-registration.example.yaml`: example-only AppService registration
  with placeholder-only `as_token` / `hs_token` values.

## AppService Registration

The registration is a shape reference only. For an approved MCR-720 run,
generate disposable, run-scoped `as_token` and `hs_token` values, keep them out
of git, and delete or revoke them during cleanup.

The `url` value is also a local placeholder for the AppService HTTP listener
scaffold. It must match the manually started listener host and port for the
approved run.

The example namespace is intentionally narrow:

- users: `@mcr_720_.*:mcr-720.localhost`
- aliases: `#mcr_720_.*:mcr-720.localhost`

Do not treat the committed placeholder tokens as approved smoke credentials.

## Ports

- Client API: `127.0.0.1:8008:8008`
- Federation-style test port: `127.0.0.1:8448:8448`

These ports are bound to localhost only. They are documented for a future
approved disposable run and are not started by default.

## Future Manual Commands

Run these only after action-scoped human approval for one MCR-720 run id:

```bash
cd infra/matrix/synapse
docker compose --profile manual config
docker compose --profile manual up -d synapse
docker compose --profile manual logs --tail=100 synapse
docker compose --profile manual down --volumes --remove-orphans
rm -rf data
```

`docker compose up` without `--profile manual` must not start this service. The
`manual` profile is the no default service start guard.

## Cleanup

After an approved run, remove every disposable artifact created for that run:

- stop Synapse with `docker compose --profile manual down --volumes --remove-orphans`
- remove `infra/matrix/synapse/data`
- remove disposable users, rooms, appservice registrations, tokens, and evidence
  working files that are not approved proof refs
- remove any generated run-scoped AppService registration file
- record cleanup status in the handoff

No GitHub client, Codex exec path, Runtime database client/path, deploy target,
secret manager, or live memory path belongs in this scaffold.
