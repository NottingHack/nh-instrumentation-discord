const { EmbedBuilder } = require('discord.js');

module.exports = function () {
    this.bookings = {};

    this.onMqttMessage = (topic, message) => {};

    this.onDiscordMessage = (message) => {
	if (!message.content.startsWith("!wiki")) return;
	const searchTerm = message.content.replace('!wiki ', '');

	var wikiEmbed = new EmbedBuilder()
	    .setTitle("Wiki Search Results")
	    .setDescription("Some results for your search term.");

	var params = new URLSearchParams({
	    action: "query",
	    list: "search",
	    srsearch: searchTerm,
	    format: "json",
	});

	const baseUrl = 'https://wiki.nottinghack.org.uk/'
	fetch(`${baseUrl}api.php?${params}`)
	    .then(response => response.json())
	    .then(results => {
		for (const i in results.query.search) {
		    const page = results.query.search[i];
		    const pageLink = encodeURI(page.title);

		    wikiEmbed.addFields({
			name: page.title,
			value: `${baseUrl}wiki/${pageLink}`
		    });
		}

		message.reply({ embeds: [ wikiEmbed ]});
	    });

	message.react('📚');
    };

};
