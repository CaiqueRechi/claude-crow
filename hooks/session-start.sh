#!/usr/bin/env bash
# Rewrites the preferences table in the conventions skill from the user's saved
# answers, or asks Claude to run /crow:setup when there are none or the plugin
# was updated since they were given. Never fails the session: exits 0 always.

pluginRoot="${CLAUDE_PLUGIN_ROOT:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
preferencesFile="${CROW_PREFERENCES_FILE:-$HOME/.claude/crow/preferences.md}"
conventionsFile="$pluginRoot/skills/conventions/SKILL.md"
startMarker="<!-- crow:preferences:start -->"
endMarker="<!-- crow:preferences:end -->"

pluginVersion="$(sed -n 's/.*"version"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' "$pluginRoot/.claude-plugin/plugin.json" 2>/dev/null | head -n 1)"

askForSetup() {
    local situation="$1"
    printf '{"hookSpecificOutput":{"hookEventName":"SessionStart","additionalContext":"crow plugin: %s Before acting on the user'"'"'s first request, invoke the crow:setup skill and run it to the end, then carry on with what they asked."}}\n' "$situation"
    exit 0
}

if [[ ! -f "$preferencesFile" ]]; then
    askForSetup "this user has not set their preferences yet (first run of crow ${pluginVersion})."
fi

savedVersion="$(sed -n 's/^crow_version:[[:space:]]*//p' "$preferencesFile" | head -n 1 | tr -d '\r[:space:]')"
if [[ "$savedVersion" != "$pluginVersion" ]]; then
    askForSetup "crow was updated to ${pluginVersion}; the preferences were set under ${savedVersion:-an unknown version} and must be confirmed (update mode)."
fi

preferencesTable="$(grep '^|' "$preferencesFile" | tr -d '\r')"
if [[ -z "$preferencesTable" ]]; then
    askForSetup "the saved preferences file has no table and must be filled in again."
fi

if [[ ! -w "$conventionsFile" ]] || ! grep -qF "$startMarker" "$conventionsFile" || ! grep -qF "$endMarker" "$conventionsFile"; then
    exit 0
fi

renderedFile="$(mktemp)"
# The table goes through the environment: a multi-line awk -v value is not portable.
tr -d '\r' < "$conventionsFile" | PREFERENCES_TABLE="$preferencesTable" awk -v start="$startMarker" -v end="$endMarker" '
    $0 == start { print; print ENVIRON["PREFERENCES_TABLE"]; skipping = 1; next }
    $0 == end { skipping = 0 }
    !skipping { print }
' > "$renderedFile"

if ! cmp -s <(tr -d '\r' < "$conventionsFile") "$renderedFile"; then
    cat "$renderedFile" > "$conventionsFile"
fi
rm -f "$renderedFile"
exit 0
