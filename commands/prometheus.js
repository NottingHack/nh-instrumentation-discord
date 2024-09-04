const { EmbedBuilder } = require('discord.js');
const prometheus = require('prom-client');
const express = require('express');
const conf = require('../config.json');

module.exports = function () {
    const registry = new prometheus.Registry();
    const expressApp = express();

    const messageCounter = new prometheus.Counter({
	name: 'discord_messages_count',
	help: 'number of messages by channel',
	labelNames: ['channel']
    });

    const presenceGuage = new prometheus.Gauge({
	name: 'discord_presence_count',
	help: 'discord online / away count',
	labelNames: ['status']
    });

    registry.registerMetric(messageCounter);
    registry.registerMetric(presenceGuage);

    this.onMqttMessage = (topic, message) => {

    };

    this.onDiscordMessage = (message) => {
	const guild = this.discordClient
	      .guilds.cache.get(conf.primaryGuild);

	guild.channels.fetch()
	    .then(channels => {
		const channel = channels.find(channel => channel.id == message.channelId);
		if (!channel) return;
		let channelName = channel.name;

		if (channelName.endsWith('-private'))
		    channelName = "<private>";

		messageCounter.inc({
		    channel: channelName
		});
	    });
    };

    this.presenceInitialised = false;
    this.onPresenceUpdate = (before, after) => {
	if (! this.presenceInitialised) {
	    const guild = this.discordClient.guilds.cache.get(conf.primaryGuild);
	    const presences = guild.presences.cache;
	    for  (const [k, v] of presences) {
		presenceGuage.inc({
		    status: v.status
		});
	    }

	    this.presenceInitialised = true;
	}

	if (after.guild.id != conf.primaryGuild) return;
	if (! after.hasOwnProperty('status')) return;

	if (before) {
	    presenceGuage.dec({
		status: before.status
	    });
	}

	presenceGuage.inc({
	    status: after.status
	});
    };

    expressApp.get("/metrics", async (req, res) => {
	res.setHeader('Content-Type', registry.contentType);
	res.send(await registry.metrics());
    });

    expressApp.listen(8990, () => {});
};


