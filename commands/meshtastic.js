const { EmbedBuilder } = require('discord.js');
const conf = require('../config.json');

const meshtasticHandler = function () {
    if (! conf.meshtastic) {
	this.onMqttMessage = () => {};
	this.onDiscordMessage = () => {};
	return;
    }

    let nodes = [];
    let conn = null;

    this.onMeshtasticNodeInfoPacket = (node) => {
	nodes = nodes.filter(n => n.num != node.num);
	nodes.push(node);
    };

    this.onMeshtasticMessagePacket = (data) => {
	this.discordClient
	    .channels.fetch(conf.meshtastic.channel)
	    .then(channel => {
		let fromNode = nodes.find(n => n.num == data.from).user.longName;
		let toNode = nodes.find(n => n.num == data.to).user.longName;

		if (!fromNode) fromNode = `${data.from}`;
		if (!toNode) toNode = `${data.to}`;

		var tempEmbed = new EmbedBuilder()
		    .setTitle("Meshtastic")
		    .setDescription(`A new meshtastic message has been received.`)
		    .addFields(
			{ name: "From", value: `${fromNode}`, inline: true },
			{ name: "To", value: `${toNode}`, inline: true },
			{ name: "Message", value: data.data }
		    );

		channel.send({
		    embeds: [
			tempEmbed
		    ],
		    flags: [ 4096 ] // silenced
		});
	    })
	    .catch(err => {
		console.log(err);
	    });
    };

    this.onMqttMessage = (topic, message) => {

    };

    this.onDiscordMessage = (message) => {
	if (!message.content.startsWith("!meshtastic")) return;

	if (message.content.startsWith("!meshtastic help")) {
	    message.reply({
		content: "!meshtastic help|nodes|reboot"
	    });
	}

	if (message.content.startsWith("!meshtastic nodes")) {
	    var tempEmbed = new EmbedBuilder()
		.setTitle("Meshtastic")
		.setDescription(`I have some friends!`)

	    for (const node of nodes) {
		let name = node.user?.longName || `Unknown ${node.num}`;
		tempEmbed.addFields(
		    {
			name: name,
			value: `${node.snr} dB, ${node.hopsAway} hops`
		    }
		);
	    };

	    message.reply({
		embeds: [ tempEmbed ]
	    });
	}

	if (message.content.startsWith("!meshtastic reboot")) {
	    conn.reboot(3)
		.then(() => {
		    message.react("✅");
		    nodes = [];
		    setTimeout(this.meshtasticConnect, 10000);
		})
		.catch(console.log)
	}
    };

    this.meshtasticConnect = () => {
	(async () => {
	    const meshtastic = await import("@meshtastic/js");

	    conn = new meshtastic.HttpConnection();
	    conn.connect({
		address: conf.meshtastic.address,
		fetchInterval: 3000,
		connType: "http"
	    });

	    conn.events.onMessagePacket
		.subscribe(this.onMeshtasticMessagePacket);

	    conn.events.onNodeInfoPacket
		.subscribe(this.onMeshtasticNodeInfoPacket);
	})().catch(console.log);
    };

    this.meshtasticConnect();
};

module.exports = meshtasticHandler;


