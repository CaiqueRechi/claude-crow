# A slow environment

## Measuring

At the URL check, request the URL five times and take the median of the total
time:

```bash
for i in 1 2 3 4 5; do curl -s -o /dev/null -w '%{time_total}\n' http://127.0.0.1:<port>/login; done
```

Run it in the foreground. A median above **1 s** means the environment is slow
and is diagnosed before it is handed over. For reference: a Laravel login page
answers in about 0.05 s from WSL and took 4 to 18 s from NTFS.

## Diagnosing — in this order

Each step names what to look at; report what you measured, and which parts are
measurement and which are inference.

1. **Where the project lives.** A path under `/mnt/c/` or a Windows folder is
   NTFS through a bind mount — the usual cause. The fix is moving it into WSL
   ([wsl.md](wsl.md)).
2. **Inherited variables.** Compare the environment of the process running the
   commands with the keys of `.env`. A colliding `COMPOSE_PROJECT_NAME`,
   `APP_PORT` or password points the commands at another project's containers
   or ports.
3. **Processes you left running.** Measurement loops, `logs -f`, watchers you
   started in the background. They survive the end of a shell and keep hitting
   the server.
4. **The containers.** `docker stats --no-stream` for this project: CPU and
   memory of each service. Low numbers while the page is slow point back to
   file access, not to the application.
5. **The machine.** Free memory and the processes using the most CPU — on
   Windows, `Get-Process | Sort-Object CPU -Descending | Select-Object -First 10`
   and `Get-CimInstance Win32_OperatingSystem` for free memory. Name each heavy
   process with its PID and how to identify it (Task Manager → Details, or
   Process Explorer for the DLL it loaded) when the name alone says nothing.

On PHP, `opcache.validate_timestamps=1` makes every request check the date of
every file; over a bind mount from NTFS that is likely much of the cost. It is
the right setting for development — the fix is the move, not the setting.

## Fixing — every fix after his yes

Propose each fix with what it changes, and apply it only after his yes to that
fix: moving the project into WSL, running the command without the inherited
variables, stopping a process you left behind, stopping a process outside the
project, restarting Docker Desktop ([docker-desktop.md](docker-desktop.md) —
it stops other projects' containers, so list them first). Measure again after
the fixes and report both medians.

## Before handing over

Every process you started in the background is stopped — measurements, loops,
log followers. The project's containers keep running: they are the
environment.
