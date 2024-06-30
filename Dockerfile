FROM node:18-alpine

RUN apk update && \
    mkdir /nh-discord

COPY commands/ /nh-discord/commands/
COPY main.js /nh-discord/main.js
COPY config.json /nh-discord/config.json
COPY entry.sh /nh-discord/entry.sh

RUN cd /nh-discord && \
    npm install discord.js mqtt && \
    chmod +x entry.sh

ENTRYPOINT ["/nh-discord/entry.sh"]
