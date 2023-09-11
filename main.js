const { Client, Events, GatewayIntentBits, AttachmentBuilder, EmbedBuilder } = require('discord.js');
const conf = require('./config.json');

const mqtt = require('mqtt')
const mqttClient  = mqtt.connect(conf.mqtt)

var BOT_USER_ID;

var temperature = {};
// var histTemperature = [];
var llapBattery = {};
var humidity = {};
var bookings = {};
var services = {};

// Create a new client instance
const discordClient = new Client({
    intents: [
	GatewayIntentBits.Guilds,
	GatewayIntentBits.GuildMessages,
	GatewayIntentBits.MessageContent,
	GatewayIntentBits.GuildMembers
    ],
});

// When the client is ready, run this code (only once)
// We use 'c' for the event parameter to keep it separate from the already defined 'client'
discordClient.once(Events.ClientReady, c => {
    console.log(`Ready! Logged in as ${c.user.tag}`);
    BOT_USER_ID = c.user.id
});

discordClient.on(Events.MessageCreate, function(message)  {
    if (message.author.id == BOT_USER_ID) return;

    if (message.content.startsWith("!help")) {
	message.reply(`
Hello! I'm Nottinghack Bot. Here is a list of commands

- !temp - temperatures within the space
- !humidity - humidity within the space
- !battery - obtain battery voltages from LLAP instrumentation
- !tools - upcoming tool bookings
- !status - instrumentation status
`);
    }

    if (message.content.startsWith("!temp")) {
	// calculate average
	const values = Object.values(temperature);
	const mean = (values.reduce((acc, cur) => acc + cur) / values.length).toFixed(2);

	var tempEmbed = new EmbedBuilder()
	    .setTitle("Temperature")
	    .setDescription(`The average temperature is ${mean} °c.`);

	for (const [k, v] of Object.entries(temperature)) {
	    tempEmbed.addFields(
		{ name: k, value: v + ' °c', inline: true}
	    );
	};

	message.reply({ embeds: [ tempEmbed ]});

	if (mean > 25)
	    message.react('🥵');
	else if (mean > 20)
	    message.react('😅');
	else if (mean > 15)
	    message.react('😊');
	else if (mean > 5)
	    message.react('🫤');
	else
	    message.react('🥶');
    }

    if (message.content.startsWith("!humidity")) {
	var humidEmbed = new EmbedBuilder()
	    .setTitle("Relative Humidity")
	    .setDescription("Here is a report of the humidity within the hackspace.");

	for (const [k, v] of Object.entries(humidity)) {
	    humidEmbed.addFields(
		{ name: k, value: v, inline: true}
	    )
	};

	message.reply({ embeds: [ humidEmbed ]});
	message.react('💦');
    }

    if (message.content.startsWith("!battery")) {
	var humidEmbed = new EmbedBuilder()
	    .setTitle("LLAP Battery Voltages")
	    .setDescription("Here is a report of the LLAP instrumentation battery voltages.");

	for (const [k, v] of Object.entries(llapBattery)) {
	    humidEmbed.addFields(
		{ name: k, value: v, inline: true}
	    )
	};

	message.reply({ embeds: [ humidEmbed ]});
	message.react('🔋');
    }

    if (message.content.startsWith("!tools")) {
	var toolEmbed = new EmbedBuilder()
	    .setTitle("Tool Bookings")
	    .setDescription("Here's an overview of upcoming tool bookings.");

	for (const [k, v] of Object.entries(bookings)) {
	    toolEmbed.addFields(
		{ name: k, value: v, inline: true}
	    )
	};

	message.reply({ embeds: [ toolEmbed ]});
	message.react('🔨');
    }

    if (message.content.startsWith("!status")) {
	var statusEmbed = new EmbedBuilder()
	    .setTitle("Service Status");

	const now = Math.floor(Date.now() / 1000);
	var count = 0;
	for (const [k, v] of Object.entries(services)) {
	    if (count++ >= 25) break;

	    var status = '💀';

	    if (v.time > now - 60)
		status = '😁';

	    statusEmbed.addFields(
		{ name: k, value: status, inline: true}
	    )
	};

	message.reply({ embeds: [ statusEmbed ]});
	message.react('💀');
    }

    if (message.content.startsWith("!display ")) {
	const displayText = message.content.replace("!display ", "");
	mqttClient.publish("nh/mb/tx", displayText);
	message.react('✅');
    }

});


mqttClient.on('connect', function () {
    conf.mqttSubscriptions.forEach(topic => {
	mqttClient.subscribe(topic, e => {
	    if (!e) return;
	    console.log(`failed to subscribe to ${topic}`);
	});
    });
})

mqttClient.on('message', function (topic, message) {
    if (topic.startsWith('nh/temperature/')) {
	const room = topic.split('/').pop()
	temperature[room] = parseFloat(message.toString());
    }

    if (topic.startsWith('nh/bookings/')) {
	const tool = topic.split('/')[2]
	if (tool == 'poll') return;
	if (tool == 'Laser') return; // old laser
	const b = JSON.parse(message.toString());
	if (b.now.display_name != "none") {
	    bookings[tool] = `${b.now.display_name}`;
	    if (b.next.display_name != "none") {
		bookings[tool] += `, then ${b.next.display_name} at ${b.next.display_time}`;
	    }
	} else if (b.next.display_name != 'none') {
	    bookings[tool] = `${b.next.display_name} at ${b.next.display_time}`;
	} else {
	    bookings[tool] = 'free';
	}
    }

    if (topic.startsWith('nh/status/res')) {
	const status = message.toString().split(': ')[0];
	const service = message.toString().split(': ')[1];
	services[service] = {
	    status: status,
	    time: Math.floor(Date.now() / 1000)
	};
    }

    if (topic.startsWith('nh/llap/messagebridge/listen')) {
	const payload = JSON.parse(message.toString());
	if (payload.type != 'WirelessMessage') return;
	if (payload.data[0].startsWith('RHUM')) {
	    const hum = payload.data[0].replace('RHUM', '') + '%';
	    var id = payload.id;

	    if (conf.wirelessMap.hasOwnProperty(id))
		id = conf.wirelessMap[id];

	    humidity[id] = hum;
	}
    }

    if (topic.startsWith('nh/llap/messagebridge/listen')) {
	const payload = JSON.parse(message.toString());
	if (payload.type != 'WirelessMessage') return;
	if (payload.data[0].startsWith('BATT')) {
	    const battery = payload.data[0].replace('BATT', '') + 'v';
	    var id = payload.id;

	    if (conf.wirelessMap.hasOwnProperty(id))
		id = conf.wirelessMap[id];

	    llapBattery[id] = battery;
	}
    }
});

// setInterval(function () {
//     if (histTemperature.length >= 60)
// 	histTemperature.shift();
//     histTemperature.push({ ...temperature}); // clone

//     console.log(histTemperature);
// }, 1000);


// Log in to Discord with your client's token
discordClient.login(conf.token);
