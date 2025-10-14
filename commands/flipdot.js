const { EmbedBuilder } = require('discord.js');

module.exports = function () {
    this.mqttClient = null;

    this.onMqttMessage = (topic, message) => {};

    this.onDiscordMessage = (message) => {
	if (!message.content.startsWith("!flipdot ")) return;

	const text = message.content.replace("!flipdot ", "");
	if (text.length == 0) {
	    message.reply(`
Send text or image to the comfy area flipdot display.

!flipdot <base64 encoded string of 84 bytes> - draw an image
!flipdot <some text> - sends some text

Have fun!
`);
	    return;
	}

	let raw = '';

	try {
	    raw = Buffer.from(text, 'base64');
	} catch (e) {}

	if (raw && raw.length == 84) {
	    this.mqttClient.publish("nh/flipdot/comfy/raw", raw);
	    message.reply(
	} else {
	    this.mqttClient.publish("nh/flipdot/comfy/text", text);
	}

	message.react('⚫');
	setTimeout(() => {
	    message.react('🟡');
	}, 1000);
    };
};
