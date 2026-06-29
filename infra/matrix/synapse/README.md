# MCR-720 Disposable Synapse Scaffold

Status: manual-only, disposable, no secrets, no default service start.

This directory is scaffold/docs only for a future human-approved Matrix-only
smoke. Do not start Docker or Synapse as part of this scaffold review.

## Files

- `docker-compose.yaml`: local-only Synapse service behind the `manual` profile.
- `homeserver.example.yaml`: example config with placeholder-only values and no
  real secrets.
- `appservice-registration.example.yaml`: example-only AppService registration
  with placeholder-only `as_token` / `hs_token` values. The compose file does
  not mount this tracked example as live smoke config.

## AppService Registration

The tracked registration is a shape reference only. For an approved MCR-720 run,
generate disposable, run-scoped `as_token` and `hs_token` values under an
untracked `MCR_MATRIX_RUN_DIR`, keep them out of git, and delete or revoke them
during cleanup.

The default generated `url` is `http://host.docker.internal:9009`, so a Synapse
container on Docker Desktop can reach a listener bound on the macOS host at
`127.0.0.1:9009`. If the approved run uses a different host route, set
`MCR_MATRIX_APPSERVICE_REGISTRATION_URL` before generating the registration.

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
RUN_ID=mcr-720-yyyymmddthhmmssz-slug
MCR_MATRIX_SMOKE_RUN_ID="$RUN_ID" \
  node ../../../apps/matrix-appservice/src/index.ts generate-matrix-smoke-config

export MCR_MATRIX_RUN_DIR="$PWD/generated/$RUN_ID"
set -a
. "$MCR_MATRIX_RUN_DIR/listener.env"
set +a

# Fill these with the disposable room/workspace mapping for the approved run.
export MCR_MATRIX_ROOM_ID='!mcr_720_room:mcr-720.localhost'
export MCR_MATRIX_WORKSPACE_ID='ws_mcr_720'
node ../../../apps/matrix-appservice/src/index.ts listen
```

In a second shell, after the generated registration and `log.config` exist:

```bash
cd infra/matrix/synapse
docker compose --profile manual config
docker compose --profile manual up -d synapse
docker compose --profile manual logs --tail=100 synapse
docker compose --profile manual down --volumes --remove-orphans
rm -rf data
rm -rf "generated/$RUN_ID"
```

`docker compose up` without `--profile manual` must not start this service. The
`manual` profile is the no default service start guard.

## Cleanup

After an approved run, remove every disposable artifact created for that run:

- stop Synapse with `docker compose --profile manual down --volumes --remove-orphans`
- remove `infra/matrix/synapse/data`
- remove `infra/matrix/synapse/generated/<run_id>` including
  `appservice-registration.yaml`, `log.config`, and `listener.env`
- remove disposable users, rooms, appservice registrations, tokens, and evidence
  working files that are not approved proof refs
- remove any generated run-scoped AppService registration file
- stop the manual listener process
- record cleanup status in the handoff

No GitHub client, Codex exec path, Runtime database client/path, deploy target,
secret manager, or live memory path belongs in this scaffold.
