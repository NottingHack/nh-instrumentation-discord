const { EmbedBuilder } = require('discord.js');
const conf = require('../config.json');

module.exports = function () {
    this.cpm = {};
    this.discordClient = null;

    this.onMqttMessage = (topic, message) => {
		if (!topic.startsWith('nh/radiation/')) return;

		const id = topic.replace('nh/radiation/', '');
		this.cpm[id] = {
		    cpm: message.toString(),
		    timestamp: new Date()
		};

		// If above 100cpm, alert Furry Radiological Response Unit
		if (Number(this.cpm[id.cpm]) < 100) return;

	    // If there are other reports from the past 2 hours don't alert
		let twoHourAgo = new Date();
		twoHourAgo.setHours(now.getHours() - 2);
		let isOtherEntries = Object.entries(this.cpm)
		    .some(([_k, v]) => v.timestamp > twoHourAgo && v.cpm > 100);
		if(isOtherEntries) return; 


		const guild = this.discordClient
		    .guilds.cache.get(conf.primaryGuild);

		// Get user Ids of FRRU members 
		guild.members.fetch()
		    .then(members => {
		        const mentions = members.filter(member => conf.FRRUUsersnames.includes(member.user.username))
				    .map(v => `<@${member.user.id}>`).join(" ");
		        if (!mentions) return;
		        this.discordClient
				    .channels.fetch(conf.notificationChannel)
				    .then(channel => {
				        channel.send({
						    content: `☢️ Unusually high CPM detected in space ☢️ \r\nLast reading: ${this.cpm[id].cpm}\r\n` +
						        `🐾☢️ Alerting Furry Radiological Response Unit 🐾☢️: ${mentions}`,
						    flags: [4096] // silenced
					    });
				    });
		    });
    };

    this.onDiscordMessage = (message) => {
	if (!message.content.startsWith("!radiation")) return;

	var radiationEmbed = new EmbedBuilder()
	    .setTitle("Radiation")
	    .setDescription("Here are the last radiation CPM readings in the space.");

	for (const [k, v] of Object.entries(this.cpm)) {
	    radiationEmbed.addFields(
		{ name: k, value: v.cpm, inline: true}
	    );
	};

	message.reply({ embeds: [ radiationEmbed ]});
	message.react('☢️');
    };
};