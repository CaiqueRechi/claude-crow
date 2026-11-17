# Running from WSL on Windows

On Windows the environment always runs from the Ubuntu distribution of WSL,
never from a Windows folder. A project on NTFS is read by the container through
a bind mount that crosses from Windows into the Docker VM on every file access.
Measured on a Laravel project: a page took 4 to 18 s from NTFS and about
0.05 s from the WSL filesystem; booting the framework in the container took
21 s; the test suite went from more than an hour to under eight minutes.

## Running a command inside Ubuntu

From the Windows side, every command for the project goes through `wsl.exe`:

```bash
wsl.exe -d Ubuntu-24.04 --cd ~/projects/<folder> -- docker compose up -d --wait
```

Use the name of the Ubuntu distribution that is actually installed
(`wsl.exe -l -v`); `Ubuntu-24.04` is the one this skill installs. The
environment inside Ubuntu starts clean: variables set in the Windows process
do not leak into it.

## Is Ubuntu ready?

Check in this order and stop at the first gap:

| Check | Command | Ready when |
| --- | --- | --- |
| an Ubuntu distribution exists | `wsl.exe -l -v` | an `Ubuntu…` line on version 2 |
| it is the default distribution | same | marked with `*` — Docker Desktop's "integration with my default WSL distro" follows the default |
| a regular user, not root | `wsl.exe -d <distro> -- whoami` | anything but `root` |
| the user is in the `docker` group | `wsl.exe -d <distro> -- id -nG` | `docker` listed |
| Docker answers from inside | `wsl.exe -d <distro> -- docker info` | no error |

## Preparing it — one step at a time, each after his yes

Show each command, say what it does, and run it only after he agrees to that
step. The steps that are his are listed for him to run; wait for him.

| Gap | Who | Step |
| --- | --- | --- |
| no Ubuntu | you, after his yes | `wsl.exe --install -d Ubuntu-24.04 --no-launch` |
| distribution enters as `root` | **him** — creating an account and its password is his | `wsl -d Ubuntu-24.04 -u root -- adduser <user>`, `wsl -d Ubuntu-24.04 -u root -- usermod -aG sudo <user>`, `wsl -d Ubuntu-24.04 -u root -- sh -c "printf '\n[user]\ndefault=<user>\n' >> /etc/wsl.conf"`, then `wsl --terminate Ubuntu-24.04` |
| not the default distribution | you, after his yes | `wsl.exe --set-default Ubuntu-24.04` |
| no `/var/run/docker.sock` inside Ubuntu | **him** — a Docker Desktop setting | Settings → Resources → WSL integration → enable the Ubuntu distribution, Apply & restart |
| user not in `docker` | you, after his yes | `wsl.exe -d Ubuntu-24.04 -u root -- usermod -aG docker <user>`, then `wsl.exe --terminate Ubuntu-24.04` |

Carry on only when `docker info` answers from inside Ubuntu.

## Moving a project that lives on NTFS

The project goes to `~/projects/<folder name>` inside Ubuntu.

1. **Uncommitted work stops the move.** `git status --porcelain` in the
   Windows folder. Anything modified or untracked — except the paths listed
   in the repository's `info/exclude`, which are copied in step 4 — is listed
   for him, and the skill stops. He commits or puts the work away and runs
   `up` again. A clone only carries commits; moving on would leave his work
   behind in a folder he is told not to use.
2. **The destination.** If `~/projects/<folder>` already exists and is a clone
   of the same repository, reuse it. If it holds anything else, ask him what
   to do before touching it.
3. **Clone from the local repository**, not from the remote: branches that only
   exist on this machine come along, and no credential is needed inside Linux.

   ```bash
   git clone --branch <current branch> --no-hardlinks "/mnt/c/<path to the Windows folder>" ~/projects/<folder>
   git -C ~/projects/<folder> remote set-url origin <origin URL of the Windows folder>
   git -C ~/projects/<folder> config core.autocrlf input
   git -C ~/projects/<folder> config user.name "<same as the Windows folder>"
   git -C ~/projects/<folder> config user.email "<same as the Windows folder>"
   ```

4. **Copy what git does not carry**: `.env`, the Docker files when they are
   not committed (`compose.yaml`, `docker/`, `.dockerignore`), and the context
   files (`CLAUDE.md`, `AGENTS.md`, `GEMINI.md`, `CONTEXT.md`,
   `ARCHITECTURE.md`, `TASKS.md`, `.context/`). Convert them from CRLF to LF on
   the way, and add the same entries to the new clone's `info/exclude`.
5. **Same compose project name.** Keep `COMPOSE_PROJECT_NAME` (or `name:`) as
   it was. The containers are recreated with the new bind mount, and the
   volumes — the database — are the same ones.
6. **Bring it up from Ubuntu** and carry on with the normal `up` steps from
   there: dependencies installed inside the container, permissions, database,
   the URL check.
7. **The Windows folder stays.** Never delete it. Tell him it is now behind,
   that work must continue in `~/projects/<folder>`, and how to open it from
   Windows: `\\wsl.localhost\<distro>\home\<user>\projects\<folder>`, or the
   WSL terminal in his IDE.

## Outside WSL: inherited variables

If a command must run from the Windows process, compare its environment with
the keys of `.env` first. Docker Compose and most frameworks prefer a variable
from the environment over the one in `.env`: an inherited
`COMPOSE_PROJECT_NAME` makes `docker compose` act on another project, and an
inherited `APP_PORT` brings the instance up on another project's port. Run
the command with every colliding key removed:

```bash
env -u COMPOSE_PROJECT_NAME -u APP_PORT -u DB_FORWARD_PORT docker compose up -d --wait
```
