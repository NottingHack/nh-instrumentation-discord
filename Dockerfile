FROM node:20-alpine

RUN apk update && \
    apk add --no-cache openssl-dev openssl-libs-static && \
    mkdir /nh-discord

COPY commands/ /nh-discord/commands/
COPY main.js /nh-discord/main.js
COPY config.json /nh-discord/config.json
COPY entry.sh /nh-discord/entry.sh

RUN cd /nh-discord && \
    npm install discord.js mqtt @meshtastic/js && \
    chmod +x entry.sh

ENTRYPOINT ["/nh-discord/entry.sh"]
