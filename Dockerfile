FROM mcr.microsoft.com/devcontainers/javascript-node

RUN apt-get update && apt-get install -y sudo ffmpeg

WORKDIR /app

COPY ./dist ./

EXPOSE 3200:3000

CMD node server/index.js