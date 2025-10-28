FROM node:20-alpine AS builder
RUN apk add --no-cache openssl-dev openssl-libs-static fontconfig font-dejavu \
    python3 build-base g++ cairo-dev pango-dev giflib-dev librsvg-dev && \
    mkdir -p /nh-discord

COPY package*.json /nh-discord/

RUN cd /nh-discord && \
    npm install


# build the runtime image
FROM node:20-alpine
RUN apk add --no-cache openssl-dev openssl-libs-static fontconfig font-dejavu cairo-dev pango-dev giflib-dev librsvg-dev && \
    mkdir -p /nh-discord

# copy built dependecies from builder stage
COPY --from=builder /nh-discord /nh-discord/

# copy the app files
COPY commands/ /nh-discord/commands/
COPY slash_commands/ /nh-discord/slash_commands/
COPY lib/ /nh-discord/lib/
COPY main.js /nh-discord/main.js
COPY charts.js /nh-discord/charts.js
COPY entry.sh /nh-discord/entry.sh

RUN chmod +x /nh-discord/entry.sh

ENTRYPOINT ["/nh-discord/entry.sh"]
