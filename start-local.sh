#!/bin/sh
set -eu
cd -- "$(dirname -- "$0")"
if [ -x "$PWD/.tools/node_modules/node/bin/node" ]; then
  PATH="$PWD/.tools/node_modules/node/bin:$PATH"
  export PATH
fi
if ! command -v node >/dev/null 2>&1; then
  echo 'Install Node.js 24.22.0 LTS first. See README.md.' >&2
  exit 1
fi
node -e 'const [major,minor]=process.versions.node.split(".").map(Number);if(major!==24||minor<22){console.error("Use Node.js 24.22.0 LTS or a newer Node 24 patch. See README.md.");process.exit(1)}'
if [ ! -d node_modules ]; then
  echo 'Dependencies are missing. Run npm ci with Node 24 LTS first.' >&2
  exit 1
fi
npm run setup
npm run build
exec npm start
