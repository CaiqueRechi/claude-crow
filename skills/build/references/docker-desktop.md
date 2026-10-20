# Docker Desktop: restart and recovery

## Never — not even with his yes

- *Troubleshoot → Clean / Purge data*
- *Reset to factory defaults*
- uninstalling Docker Desktop

All three delete `%LOCALAPPDATA%\Docker\wsl\disk\docker_data.vhdx`, the disk
holding every image and volume on the machine — the database of every project,
not just this one. Changing a Docker Desktop setting (the WSL integration, for
one) stays his as well.

## Restarting

A restart is allowed after his yes, and stops the containers of **every**
project on the machine. Before asking, list them:

```bash
docker ps --format '{{.Names}}\t{{.Label "com.docker.compose.project"}}'
```

Name the ones that do not belong to this project in the question. After his
yes: `docker desktop restart`, then wait for `docker info` to answer.

## When it does not come back

Seen in practice: after a restart, Docker Desktop stopped with "Some files are
not correctly signed", the engine reported 0 containers and 0 images, and the
data was intact all along — the engine had simply not mounted its disk.

1. **Look before acting.** `docker info`; check that `docker_data.vhdx` is
   still there and its size; for the files the warning names,
   `Get-AuthenticodeSignature <file>` and their dates. Valid signatures with
   dates older than the rest of the installation point to an update that did
   not finish replacing its files.
2. **Lingering processes.** If Docker Desktop reports processes it cannot stop
   (`Docker Desktop.exe`, `com.docker.backend.exe`, `com.docker.build.exe`),
   they usually run elevated, which is why a normal terminal gets "access
   denied". Tell him which PIDs, and after his yes run one elevated command
   that does only this — he approves the UAC prompt:

   ```powershell
   Start-Process powershell -Verb RunAs -ArgumentList '-NoProfile','-Command','Stop-Process -Id <pid>,<pid> -Force'
   ```

3. `wsl --shutdown`, to drop the state of the Docker VM, then
   `docker desktop start`, and wait for `docker info`.
4. **Check nothing was lost**: `docker ps -a`, `docker images`,
   `docker volume ls` — the volumes of every project should be back.
5. **If the signature warning persists**, the fix is the official installer of
   the same version run over the current installation. Installing is his: give
   him the link and the version, and wait.

At no point in this sequence do the three options above come up.
