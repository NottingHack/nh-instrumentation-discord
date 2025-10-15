const { EmbedBuilder } = require('discord.js');
const conf = require('../config.json');

module.exports = function () {
    this.mqttClient = null;

    this.onMqttMessage = (topic, message) => {};

    this.onDiscordMessage = async (message) => {
	if (!message.content.startsWith("!flipdot ")) return;

	const text = message.content.replace("!flipdot ", "");
	if (text == "help") {
	    message.reply(`
Send text or image to the comfy area flipdot display.

!flipdot <base64 encoded string of 84 bytes> - draw an image
!flipdot <some text> - sends some text

Have fun!
`);
	    return;
	}

	if (text.startsWith("baby-asm")) {
		const text = text.replace("baby-asm", "");
		return await submitBabyAsm(text, message);
	}

	if (text.startsWith("baby-cancel")) {
		const text = text.replace("baby-asm", "");
		return await cancelBabyProgram(text);
	}

	let raw = '';

	try {
	    raw = Buffer.from(text, 'base64');
	} catch (e) {}

	if (raw && raw.length == 84) {
	    this.mqttClient.publish("nh/flipdot/comfy/raw", raw);
	} else {
	    this.mqttClient.publish("nh/flipdot/comfy/text", text);
	}

	message.react('⚫');
	setTimeout(() => {
	    message.react('🟡');
	}, 1000);
    };
};

async function cancelBabyProgram(message) {
	try {
		let response = await fetch(`${conf.flipdotBabyEmulator}/cancel`, {
			method: "POST"
		});
		if (response.ok) {
			message.react('✅');
			return;
		} else {
			let reply = `Failed to reach the emulation server; response code ${response.status} `;
			message.reply(reply);
		}
	}
	catch (e) {
		console.log(e);
		message.reply('Problem querying the eulation server, sorry');
	}
}

async function submitBabyAsm(text, message) {
	let ogNotation = false;
	if (text.contains("og-notation")) {
		ogNotation = true;
		text = text.replace("og-notation", "");
	}
	text.replace("`", "");
	text.replace("```asm", "");
	try {
		let response = await fetch(`${conf.flipdotBabyEmulator}/assemble_run`, {
			method: "POST",
			body: JSON.stringify({ listing: text, og_notation: ogNotation })
		});
		if (response.ok) {
			message.react('✅');
			return;
		}
		if (response.status === 400) {
			let reason = response.text();
			message.reply(`Asm error:\n${reason}`)
		} else if (response.status === 503) {
			message.reply(`A program is already running, try \`!flipdot baby-cancel\` to terminate it`);
		} else {
			let reason = response.text();
			let reply = `Failed to reach the emulation server; response code ${response.status} `
			if (reason) {
				reply += `\nMessage: ${reason}`
			}
			message.reply(reply);
		}
	}
	catch (e) {
		console.log(e);
		message.reply('Problem querying the eulation server, sorry');
	}
}
