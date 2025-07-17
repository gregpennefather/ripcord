Build:
> npm run build:release
> docker build -t ripcord .

Run
> docker run --name ripcord --mount type=bind,src=local/folder/path,dst=/videos --rm -p 3200:3000 ripcord