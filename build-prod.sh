cd ./client
npm ci
npm run build:prod

cd ../server
npm ci
npm run build:prod

cd ..
cp .\\.env .\\dist