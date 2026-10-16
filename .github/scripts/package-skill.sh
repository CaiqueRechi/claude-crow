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

if [[ "$(manifestField name)" != "crow" ]]; then
    echo ".claude-plugin/plugin.json must declare name: crow." >&2
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

    if ! node -e '
        const fs = require("fs");
        const normalize = (path) => fs.readFileSync(path, "utf8").replace(/\r\n/g, "\n");
        process.exit(normalize(process.argv[2]).includes(normalize(process.argv[1])) ? 0 : 1);
    ' .github/non-negotiable-rules.md "$skillFile"; then
        echo "$skillFile must contain .github/non-negotiable-rules.md verbatim." >&2
        exit 1
    fi
done

documentationFiles=(docs/*.md)
if (( ${#documentationFiles[@]} == 0 )); then
    echo "At least one Markdown file is required in docs/." >&2
    exit 1
fi

outputDirectory="dist"
packageDirectory="$outputDirectory/crow"
archiveName="crow-v$version.zip"

rm -rf -- "$outputDirectory"
mkdir -p "$packageDirectory/docs"

cp README.md VERSION "$packageDirectory/"
cp -R .claude-plugin skills assets "$packageDirectory/"
cp "${documentationFiles[@]}" "$packageDirectory/docs/"

(
    cd "$outputDirectory"
    zip -q -r "$archiveName" crow
    sha256sum "$archiveName" > "$archiveName.sha256"
)

echo "Created $outputDirectory/$archiveName"
echo "Created $outputDirectory/$archiveName.sha256"
