const { EmbedBuilder } = require('discord.js');
const conf = require('../config.json');

module.exports = function () {
    this.discordClient = null;

    this.onMqttMessage = (topic, message) => {
	if (!topic.startsWith('nh/discord/')) return;

	if (topic == 'nh/discord/tx') { // send to #bot-spam
	    console.log(message);
	    this.discordClient
		.channels.fetch(conf.notificationChannel)
		.then(channel => {
		    channel.send({
			content: message.toString(),
			flags: [ 4096 ] // silenced
		    });
		});

	} else if (topic.startsWith('nh/discord/tx/') && !topic.includes('/pm/')) {
	    const target = topic.replace('nh/discord/tx/', '');

	    const guild = this.discordClient
		  .guilds.cache.get(conf.primaryGuild);

	    guild.channels.fetch()
		.then(channels => {
		    const channel = channels.find(channel => channel.name == target);
		    if (!channel) return;

		    this.discordClient
			.channels.fetch(channel.id)
			.then(channel => {
			    channel.send({
				content: message.toString(),
				flags: [ 4096 ] // silenced
			    });
			})
			.catch(console.error);

		});

	} else if (topic.startsWith('nh/discord/tx/pm/')) {
	    const target = topic.replace('nh/discord/tx/pm/', '');
	    const guild = this.discordClient
		  .guilds.cache.get(conf.primaryGuild);

	    guild.members.fetch()
		.then(members => {
		    const member = members.find(member => member.user.username == target);
		    if (!member) return;

		    this.discordClient
			.users.fetch(member.user.id)
			.catch(console.error)
			.then(user => {
			    user.send(message.toString())
				.catch(console.error);
			});
		});
	}
    };

    this.onDiscordMessage = (message) => {
	const guild = this.discordClient
	      .guilds.cache.get(conf.primaryGuild);

	guild.channels.fetch()
	    .then(channels => {
		const channel = channels.find(channel => channel.id == message.channelId);
		if (!channel) return;
		if (channel.name.endsWith('-private')) return;

		let displayName = message.author.displayName.replace("/", "");
		if (message.content) {
		    let reparsed = message.content;
		    let idRegex = /\<@(?<id>[0-9]*)>/g;

		    if (reparsed.match(idRegex)?.length) {
			guild.members.fetch()
			    .then(members => {
				let match;
				while ((match = idRegex.exec(reparsed)) !== null) {
				    let id = match.groups.id;
				    const member = members.find(member => member.user.id == id);
				    reparsed = reparsed.replace(`<@${id}>`, `@<${member.displayName}>`);
				}

				this.mqttClient
				    .publish(`nh/discord/rx/${channel.name}/${displayName}`,
					     reparsed);
			    })
		    } else {
			this.mqttClient
			    .publish(`nh/discord/rx/${channel.name}/${displayName}`,
				     message.content);
		    }
		}
		this.mqttClient
		    .publish(`nh/discord/json/rx`, JSON.stringify(message));
	    });
    };
};
