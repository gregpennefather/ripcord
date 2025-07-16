Build:
> .\build-prod.sh
> docker build -t ripcord .

Run
> docker run --mount type=bind,src=<SRC>,dst=/videos --rm -p 3200:3000 ripcord