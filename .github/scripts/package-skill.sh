#!/usr/bin/env bash

set -euo pipefail

repositoryRoot="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$repositoryRoot"

version="$(tr -d '[:space:]' < VERSION)"
if [[ ! "$version" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
    echo "VERSION must contain a semantic version such as 1.0.0." >&2
    exit 1
fi

manifestField() {
    node -e 'const manifest = require(process.argv[1]); process.stdout.write(String(manifest[process.argv[2]] ?? ""))' \
        "./.claude-plugin/plugin.json" "$1"
}

if [[ "$(manifestField name)" != "rm" ]]; then
    echo ".claude-plugin/plugin.json must declare name: rm." >&2
    exit 1
fi

# The plugin manager reads the manifest version, the release reads VERSION.
if [[ "$(manifestField version)" != "$version" ]]; then
    echo ".claude-plugin/plugin.json version must match VERSION ($version)." >&2
    exit 1
fi

shopt -s nullglob
skillFiles=(skills/*/SKILL.md)
if (( ${#skillFiles[@]} == 0 )); then
    echo "At least one skill is required in skills/<name>/SKILL.md." >&2
    exit 1
fi

# A skill whose name differs from its folder fails to load without any error.
for skillFile in "${skillFiles[@]}"; do
    folderName="$(basename "$(dirname "$skillFile")")"
    skillName="$(sed -n 's/^name:[[:space:]]*//p' "$skillFile" | head -n 1 | tr -d '\r')"
    if [[ "$skillName" != "$folderName" ]]; then
        echo "$skillFile must declare name: $folderName." >&2
        exit 1
    fi
done

documentationFiles=(docs/*.md)
if (( ${#documentationFiles[@]} == 0 )); then
    echo "At least one Markdown file is required in docs/." >&2
    exit 1
fi

outputDirectory="dist"
packageDirectory="$outputDirectory/rm-skill-claude"
archiveName="rm-skill-claude-v$version.zip"

rm -rf -- "$outputDirectory"
mkdir -p "$packageDirectory/docs"

cp README.md VERSION "$packageDirectory/"
cp -R .claude-plugin skills "$packageDirectory/"
cp "${documentationFiles[@]}" "$packageDirectory/docs/"

(
    cd "$outputDirectory"
    zip -q -r "$archiveName" rm-skill-claude
    sha256sum "$archiveName" > "$archiveName.sha256"
)

echo "Created $outputDirectory/$archiveName"
echo "Created $outputDirectory/$archiveName.sha256"
