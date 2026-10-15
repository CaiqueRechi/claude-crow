#!/usr/bin/env bash

set -euo pipefail

repositoryRoot="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$repositoryRoot"

version="$(tr -d '[:space:]' < VERSION)"
if [[ ! "$version" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
    echo "VERSION must contain a semantic version such as 1.0.0." >&2
    exit 1
fi

skillName="$(sed -n 's/^name:[[:space:]]*//p' SKILL.md | head -n 1 | tr -d '\r')"
if [[ "$skillName" != "rm-skill-claude" ]]; then
    echo "SKILL.md must declare name: rm-skill-claude." >&2
    exit 1
fi

shopt -s nullglob
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

cp README.md SKILL.md "$packageDirectory/"
cp "${documentationFiles[@]}" "$packageDirectory/docs/"
cp -R references "$packageDirectory/"

(
    cd "$outputDirectory"
    zip -q -r "$archiveName" rm-skill-claude
    sha256sum "$archiveName" > "$archiveName.sha256"
)

echo "Created $outputDirectory/$archiveName"
echo "Created $outputDirectory/$archiveName.sha256"
