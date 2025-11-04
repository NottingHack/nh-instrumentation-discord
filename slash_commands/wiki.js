const {
    MessageFlags,
    SlashCommandBuilder,
    EmbedBuilder,
    AttachmentBuilder,
    ButtonBuilder,
    ButtonStyle,
    ActionRowBuilder
} = require('discord.js');
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
        return (new SlashCommandBuilder()
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

        // Create "thinking..." response
        await interaction.deferReply({
            flags: MessageFlags.Ephemeral,
        })

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

        const pageContent = await fetch(`${baseUrl}api.php?${params}`)
            .then(response => response.json())
            .then(results => {
                const pages = results.query?.pages
                if ((pages || []).length === 0) {
                    return null;
                }
                const revisions = pages[0]?.revisions;
                if ((revisions || []).length === 0) {
                    return null;
                }
                return revisions[0]?.slots?.main?.content || '';
            })
            .catch((err) => {
                console.error('Failed to fetch wiki page', err);
            })

        if (!pageContent) {
            await interaction.editReply({
                content: `Sorry, page was not available.`,
                flags: MessageFlags.Ephemeral,
            });
            return;
        }

        const toolData = extractToolData(pageContent, ['image'])
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
            wikiEmbed.setDescription(pageContent.length > 512 ? pageContent.slice(0, 512) + "..." : pageContent)
        }

        const actionsRow = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('post')
                    .setLabel('Post to channel')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('✅')
            );

        await interaction.editReply({
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