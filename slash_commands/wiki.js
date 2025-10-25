const { MessageFlags, SlashCommandBuilder, EmbedBuilder, AttachmentBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder} = require('discord.js');
const {generateQRCode} = require("../lib/qrcode");
const {extractToolData} = require("../lib/wiki");

module.exports = function () {

    /**
     * Injected by main.js
     */
    let discordClient;

    const commandName = 'wiki';

    const baseUrl = 'https://wiki.nottinghack.org.uk/'

    this.configure = () => {
        return  (new SlashCommandBuilder()
            .setName(commandName)
            .setDescription('Find a wiki page')
            .addStringOption(option =>
                option.setName('query')
                    .setDescription('page name to find')
                    .setRequired(true)
                    .setAutocomplete(true)
            )).toJSON()
    }

    this.accept = (name) => {
        return name === commandName;
    };

    /**
     * Handle autocomplete request.
     */
    this.autocomplete = async (interaction) => {
        const focusedOption = interaction.options.getFocused(true);
        if (!focusedOption.value) {
            await interaction.respond([])
            return;
        }

        const params = new URLSearchParams({
            action: "query",
            list: "search",
            srsearch: focusedOption.value,
            format: "json",
            // max 10 embeds per message
            srlimit: "10",
        });

        await fetch(`${baseUrl}api.php?${params}`)
            .then(response => response.json())
            .then(results => {
                const options = [];
                for (const i in (results?.query?.search ?? [])) {
                    const page = results.query.search[i];
                    const pageName = page.title;
                    options.push({name: page.title, value: pageName})
                }

                return interaction.respond(options)
            })
    }

    /**
     * Handle slash command.
     */
    this.execute = async (interaction) => {
        const pageName = interaction.options.getString('query');

        const params = new URLSearchParams({
            action: "query",
            titles: pageName,
            format: "json",
            prop: "revisions",
            formatversion: "2",
            rvprop: "content",
            rvslots: "*",
        });

        const page = await fetch(`${baseUrl}api.php?${params}`)
            .then(response => response.json())
            .then(results => {
                return results.query?.pages[0]?.revisions[0]?.slots?.main || {}
            })

        const toolData = extractToolData(page.content, ['image'])
        const fileName = `${toFileName(pageName)}-qr.png`
        const url = `${baseUrl}wiki/${encodeURI(pageName)}`;
        const qrCodeBuff = await generateQRCode(url, pageName)

        const wikiEmbed = new EmbedBuilder()
            .setTitle(pageName)
            .setURL(url)
            .setThumbnail(`attachment://${fileName}`)

        if (toolData != null) {
            wikiEmbed.setFields(toolData)
        } else {
            wikiEmbed.setDescription(page.content.length > 512 ? page.content.slice(0, 512)+"..." : page.content)
        }

        const actionsRow = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('post')
                    .setLabel('Post to channel')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('✅')
            );

        await interaction.reply({
            content: `\`Posted by ${interaction.user?.globalName ?? interaction.user?.username ?? 'Unknown'}\``,
            flags: MessageFlags.Ephemeral,
            embeds: [wikiEmbed],
            files: [new AttachmentBuilder(qrCodeBuff, {name: fileName})],
            components: [actionsRow]
        });
    };

    /**
     * Handle any button presses.
     */
    this.handleButton = async (interaction) => {
        switch (interaction.customId) {
            case "post":
                await interaction.reply({
                    content: interaction.message.content,
                    embeds: interaction.message.embeds,
                });
        }
    }

    function toFileName(str) {
        return str.toLowerCase().replaceAll(/[^0-9a-z]/ig, "-")
    }

}