#!/bin/sh
# chrome/ を元に dist/chrome と dist/firefox を作り、ストア提出用の zip を出す。
# firefox 版は chrome/manifest.json に firefox/manifest-overrides.json を重ねたもの。
set -eu
cd "$(dirname "$0")"

version=$(jq -r .version chrome/manifest.json)

rm -rf dist
mkdir -p dist/chrome dist/firefox

cp chrome/* dist/chrome/
cp chrome/* dist/firefox/
jq -s '.[0] * .[1]' chrome/manifest.json firefox/manifest-overrides.json \
    > dist/firefox/manifest.json

# manifest.json が zip の直下に来るように固める
(cd dist/chrome && zip -qrX "../kiseppe-chrome-$version.zip" .)
(cd dist/firefox && zip -qrX "../kiseppe-firefox-$version.zip" .)

echo "built: dist/kiseppe-chrome-$version.zip dist/kiseppe-firefox-$version.zip"
