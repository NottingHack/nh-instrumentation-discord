const { EmbedBuilder } = require('discord.js');
const prometheus = require('prom-client');
const express = require('express');
const crypto = require('crypto');
const conf = require('../config.json');

module.exports = function () {
    const registry = new prometheus.Registry();
    const expressApp = express();

    const messageCounter = new prometheus.Counter({
	name: 'discord_messages_count',
	help: 'number of messages by channel',
	labelNames: ['channel']
    });

    const userMessageCounter = new prometheus.Counter({
       name: 'discord_messages_user_count',
       help: 'number of messages by user',
       labelNames: ['userHash']
    });

    const messageEmojiCounter = new prometheus.Counter({
       name: 'discord_message_emoji_count',
       help: 'counter per emoji used in discord messages',
       labelNames: ['emoji']
    });

    const presenceGuage = new prometheus.Gauge({
	name: 'discord_presence_count',
	help: 'discord online / away count',
	labelNames: ['status']
    });

    const mphHistogram = new prometheus.Histogram({
	name: 'discord_messages_per_hour_count',
	help: 'the number of discord messages in total sent per hour',
	buckets: [ 3600 ]
    });

    registry.registerMetric(messageCounter);
    registry.registerMetric(userMessageCounter);
    registry.registerMetric(messageEmojiCounter);
    registry.registerMetric(presenceGuage);
    registry.registerMetric(mphHistogram);

    this.onMqttMessage = (topic, message) => {

    };

    this.onDiscordMessage = (message) => {
	mphHistogram.observe(1);

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

		this.detectAndCountEmojis(message);

		if (message.member?.id) {
                    let userHash = crypto.createHash('md5').update(message.member.id).digest('hex').substring(0, 8);
                    userMessageCounter.inc({
			userHash: userHash
                    });
		}
	    });
    };

    this.detectAndCountEmojis = (message) => {
	if (! message.content) return;

	const emojiRegex = /[\u{1f300}-\u{1f5ff}\u{1f900}-\u{1f9ff}\u{1f600}-\u{1f64f}]/u;
	while ((match = emojiRegex.exec(message.content)) !== null) {
	    messageEmojiCounter.inc({
		emoji: match[0]
	    });
	}
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
