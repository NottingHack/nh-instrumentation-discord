const {
    MessageFlags,
    SlashCommandBuilder,
    EmbedBuilder,
    ButtonBuilder,
    ButtonStyle,
    ActionRowBuilder,
    AttachmentBuilder,
} = require('discord.js');
const {generateQRCode} = require("../lib/qrcode");
const {wikiURL, imageUrl, extractPageData, removeImages, fixRelativeLinks} = require("../lib/wiki");

// wtf can parse wikitext to markdown
const wtf = require('wtf_wikipedia')
wtf.extend(require('wtf-plugin-markdown'))

module.exports = function () {

    /**
     * Injected by main.js
     */
    let discordClient;

    const commandName = 'wiki';

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
            srlimit: "10",
        });

        await fetch(`${wikiURL}/api.php?${params}`)
            .then(response => response.json())
            .then(results => {
                const options = [];
                for (const i in (results?.query?.search ?? [])) {
                    const page = results.query.search[i];
                    const pageName = page.title;
                    if((page?.snippet || '').startsWith('#REDIRECT')) {
                       continue;
                    }
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
        });

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

        const rawPageContent = await fetch(`${wikiURL}/api.php?${params}`)
            .then(response => response.json())
            .then(results => {
                const pages = results.query?.pages;
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

        if (!rawPageContent) {
            await replyError(interaction, `Sorry, page was not available.`,  { pageName })
            return;
        }

        // table of attributes shows on the right of the wiki page
        const pageAttrs = extractPageData(rawPageContent);

        // body text of article (with attribute table removed where applicable)
        const pageContent = pageAttrs ? rawPageContent.replace(pageAttrs.raw, '') : rawPageContent;
        const contentAsMarkdown = fixRelativeLinks(removeImages(wtf(pageContent).markdown()));
        const pageURL = `${wikiURL}/wiki/${encodeURI(pageName)}`;

        // image from the attributes (if available)
        // todo: is there a way to get a thumbnail rather than the full-sized image?
        const pageImage = imageUrl(
            ((pageAttrs?.rows ?? []).find((row) => row.name === 'image')?.value ?? '')
        );

        const wikiEmbed = new EmbedBuilder()
            .setTitle(pageName)
            .setURL(pageURL)
            .setFields(
                (pageAttrs?.rows ?? []).filter(
                    // only include some fields
                    (row) => ['location', 'floor', 'use', 'team', 'induction'].includes(row.name),
                )
            );

        if (pageImage) {
            wikiEmbed.setThumbnail(pageImage);
        }

        // add some of the article text
        wikiEmbed.setDescription(contentAsMarkdown.length > 1024 ? `${contentAsMarkdown.slice(0, 1024)}...` : contentAsMarkdown);

        const actionsRow = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('post')
                    .setLabel('Post to channel')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('✅')
            ).addComponents(
                new ButtonBuilder()
                    .setCustomId('qr-code')
                    .setLabel('Generate QR Code')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('🏁')
            );

        await interaction.editReply({
            content: `\`${interaction.user?.globalName ?? interaction.user?.username ?? 'Unknown'}\` posted a link to [${pageName}](${pageURL})`,
            flags: MessageFlags.Ephemeral,
            embeds: [wikiEmbed],
            components: [actionsRow]
        });
    };

    /**
     * Handle any button presses.
     */
    this.handleButton = async (interaction) => {
        switch (interaction.customId) {
            case "qr-code":
                // update the message with a QR code that links to the page that was selected.
                const embed = interaction.message.embeds[0];
                if (!embed) {
                    await replyError(interaction, "Failed to create QR code, embed not found")
                    return;
                }
                const fileName = `${toFileName(embed.title)}-qr.png`
                const qrCodeBuff = await generateQRCode(embed.url, embed.title)

                await interaction.deferUpdate();
                await interaction.editReply({
                    content: interaction.message.content,
                    flags: MessageFlags.Ephemeral,
                    embeds: interaction.message.embeds,
                    files: [new AttachmentBuilder(qrCodeBuff, {name: fileName})],
                });
                break;
            case "post":
                // post the article without the ephemeral flag.
                // note: you cannot update a message from ephemeral to non-ephemeral so it must post a new reply.
                await interaction.reply({
                    content: interaction.message.content,
                    embeds: interaction.message.embeds,
                    // leave out the QR code if one exists, they can always copy it and send it if they need it.
                });
                break;
            default:
                await replyError(interaction, "Unknown button could not be handled.", {customId: interaction.customId})
        }
    }

    /**
     * Create a valid file name from a string.
     *
     * @param {string} str
     * @returns {string}
     */
    function toFileName(str) {
        return str.toLowerCase().replaceAll(/[^0-9a-z]/ig, "-")
    }

    /**
     * Send an error message to the user.
     *
     * @param {Interaction} interaction
     * @param {string} errorMessage
     * @param {any} context
     * @returns {Promise<void>}
     */
    async function replyError(interaction, errorMessage, context = {}) {
        console.error("Error was returned to user", errorMessage, context)
        await interaction.reply({
            content: `Error: ${errorMessage}`,
            flags: MessageFlags.Ephemeral,
        });
    }

}