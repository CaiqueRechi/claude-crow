#!/usr/bin/env bash
# Keeps crow locked behind /crow:setup: only setup ships in skills/, the other
# skills wait in locked-skills/ until every preference in setup's catalog has an
# answer. Then they are copied into skills/ and the conventions table is
# rewritten from the answers. Never fails the session: exits 0 always.

pluginRoot="${CLAUDE_PLUGIN_ROOT:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
preferencesFile="${CROW_PREFERENCES_FILE:-$HOME/.claude/crow/preferences.md}"
catalogFile="$pluginRoot/skills/setup/references/preferences.md"
conventionsFile="$pluginRoot/skills/conventions/SKILL.md"
startMarker="<!-- crow:preferences:start -->"
endMarker="<!-- crow:preferences:end -->"

tellClaude() {
    printf '{"hookSpecificOutput":{"hookEventName":"SessionStart","additionalContext":"crow plugin: %s"}}\n' "$1"
    exit 0
}

askForSetup() {
    tellClaude "$1 Only /crow:setup is available until it is done. Before acting on the user's first request, invoke the crow:setup skill and run it to the end, then carry on with what they asked."
}

# First column of every table row except the header and the separator.
preferenceNames() {
    tr -d '\r' < "$1" | awk -F'|' '/^\|/ && $2 !~ /^ *(Preferência|-+) *$/ { gsub(/^ +| +$/, "", $2); print $2 }'
}

if [[ ! -f "$preferencesFile" ]]; then
    askForSetup "this user has not set their preferences yet."
fi

missingPreferences="$(comm -23 <(preferenceNames "$catalogFile" | sort) <(preferenceNames "$preferencesFile" | sort) | paste -sd ',' - | sed 's/,/, /g')"
if [[ -n "$missingPreferences" ]]; then
    askForSetup "this version of crow has preferences the user has not answered yet (${missingPreferences})."
fi

releasedSkills=()
for lockedSkill in "$pluginRoot"/locked-skills/*/; do
    skillName="$(basename "$lockedSkill")"
    if [[ ! -d "$pluginRoot/skills/$skillName" ]]; then
        cp -R "$lockedSkill" "$pluginRoot/skills/$skillName" && releasedSkills+=("$skillName")
    fi
done

if [[ -w "$conventionsFile" ]] && grep -qF "$startMarker" "$conventionsFile" && grep -qF "$endMarker" "$conventionsFile"; then
    preferencesTable="$(grep '^|' "$preferencesFile" | tr -d '\r')"
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
fi

if (( ${#releasedSkills[@]} > 0 )); then
    tellClaude "the preferences are complete, so these skills were released: ${releasedSkills[*]}. If /crow does not list them yet, ask the user to run /reload-plugins."
fi
exit 0
