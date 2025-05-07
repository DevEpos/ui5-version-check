echo "> Cleaning output"
npm run clean

echo "> Preparing build..."
npm run build

echo "> Copying additional sources"
cp README.md LICENSE CHANGELOG.md dist/src

echo ">> Processing package.json"
jq 'del(.scripts, .devDependencies)' package.json > dist/src/package.json