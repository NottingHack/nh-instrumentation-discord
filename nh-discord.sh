#!/bin/bash

docker build -t nh-discord .

# Clean up previous builds if needed
(docker container ls | grep nh-discord) && \
    docker stop nh-discord && \
    docker rm nh-discord

docker create --name nh-discord -p 8990:8990/tcp --restart=always nh-discord

# For access to MQTT
docker network connect instrumentation nh-discord

# So that the prometheus endpoint can be queried
docker network connect loki nh-discord

docker start -v ./config.json:/nh-discord/config.json nh-discord
