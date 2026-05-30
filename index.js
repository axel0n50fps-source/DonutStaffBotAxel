require('dotenv').config();

const {
    Client,
    GatewayIntentBits,
    EmbedBuilder,
    SlashCommandBuilder,
    REST,
    Routes,
    ActionRowBuilder,
    StringSelectMenuBuilder
} = require('discord.js');

const fs = require('fs');

// =========================
// CONFIG
// =========================

const TOKEN = process.env.TOKEN;

const CLIENT_ID = '1508923533441499336';

const OWNER_ID = '1284603516786315336';

const SERVER_IP = 'donutsmp.net';

// =========================

const client = new Client({
    intents: [GatewayIntentBits.Guilds]
});

// =========================
// FILES
// =========================

function getStaffList() {

    return JSON.parse(
        fs.readFileSync('./staff.json')
    );
}

function saveStaffList(list) {

    fs.writeFileSync(
        './staff.json',
        JSON.stringify(list, null, 2)
    );
}

function getLastSeen() {

    if (!fs.existsSync('./lastseen.json')) {

        fs.writeFileSync(
            './lastseen.json',
            '{}'
        );
    }

    return JSON.parse(
        fs.readFileSync('./lastseen.json')
    );
}

function saveLastSeen(data) {

    fs.writeFileSync(
        './lastseen.json',
        JSON.stringify(data, null, 2)
    );
}

function getTrackerData() {

    if (!fs.existsSync('./tracker.json')) {

        fs.writeFileSync(
            './tracker.json',
            '{}'
        );
    }

    return JSON.parse(
        fs.readFileSync('./tracker.json')
    );
}

function saveTrackerData(data) {

    fs.writeFileSync(
        './tracker.json',
        JSON.stringify(data, null, 2)
    );
}

// =========================
// GET ONLINE PLAYERS
// =========================

async function getPlayers() {

    try {

        const response =
            await fetch(
                `https://api.mcstatus.io/v2/status/java/${SERVER_IP}`
            );

        const data =
            await response.json();

        if (
            !data.players ||
            !data.players.list
        ) {
            return [];
        }

        return data.players.list;

    } catch {

        return [];
    }
}

// =========================
// COMMANDS
// =========================

const commands = [

    new SlashCommandBuilder()

        .setName('setuptracker')

        .setDescription(
            'Create the live DonutSMP tracker'
        ),

    new SlashCommandBuilder()

        .setName('stafflistupdate')

        .setDescription(
            'Update the staff list'
        )

        .addSubcommand(sub =>
            sub

                .setName('add')

                .setDescription(
                    'Add staff member'
                )

                .addStringOption(option =>
                    option

                        .setName('username')

                        .setDescription(
                            'Minecraft username'
                        )

                        .setRequired(true)
                )
        )

        .addSubcommand(sub =>
            sub

                .setName('remove')

                .setDescription(
                    'Remove staff member'
                )

                .addStringOption(option =>
                    option

                        .setName('username')

                        .setDescription(
                            'Minecraft username'
                        )

                        .setRequired(true)
                )
        )

        .addSubcommand(sub =>
            sub

                .setName('list')

                .setDescription(
                    'View staff list'
                )
        )

].map(command => command.toJSON());

// =========================
// REGISTER COMMANDS
// =========================

const rest =
    new REST({ version: '10' })
        .setToken(TOKEN);

(async () => {

    try {

        await rest.put(
            Routes.applicationCommands(
                CLIENT_ID
            ),
            { body: commands }
        );

        console.log(
            'Commands registered.'
        );

    } catch (error) {

        console.error(error);
    }

})();

// =========================
// READY
// =========================

client.once('ready', () => {

    console.log(
        `${client.user.tag} is online!`
    );
});

// =========================
// UPDATE TRACKER
// =========================

async function updateTracker() {

    try {

        const tracker =
            getTrackerData();

        if (
            !tracker.channelId ||
            !tracker.messageId
        ) return;

        const channel =
            await client.channels.fetch(
                tracker.channelId
            );

        const message =
            await channel.messages.fetch(
                tracker.messageId
            );

        const players =
            await getPlayers();

        const staffList =
            getStaffList();

        let lastSeen =
            getLastSeen();

        let online = [];

        for (const staff of staffList) {

            const found = players.find(
                p =>
                    p.name_clean &&
                    p.name_clean.toLowerCase() ===
                    staff.toLowerCase()
            );

            if (found) {

                online.push(
                    `<:online_discord:1510364784548380732> ${staff}`
                );

                lastSeen[staff] = {

                    online: true,

                    lastSeen:
                        'Currently Online'
                };

            } else {

                if (
                    !lastSeen[staff] ||
                    lastSeen[staff].online === true
                ) {
                    lastSeen[staff] = {

                        online: false,

                        lastSeen:
                            Math.floor(Date.now() / 1000)
                    };
                }
            }
        }

        saveLastSeen(lastSeen);

        const embed =
            new EmbedBuilder()

                .setTitle(
                    '<:Zerio_Client_fidget:1510284681931915284> Zerio Staff Tracker'
                )

                .setDescription(
                    online.length
                        ? online.join('\n')
                        : 'No staff members are currently online.'
                )

                .addFields({
                    name:
                        '<:zzerio:1510284681931915284> Live Updates',

                    value:
                        '-# Automatically refreshed every 15 seconds.'
                })

                .setColor('#7CFF3B')

                .setFooter({
                    text:
                        '-# Real-time staff activity monitoring'
                })


        const menu =
            new StringSelectMenuBuilder()

                .setCustomId(
                    'staff_select'
                )

                .setPlaceholder(
                    'Select a staff member'
                )

                .addOptions(
                    staffList.map(staff => ({
                        label: staff,
                        value: staff
                    }))
                );

        const row =
            new ActionRowBuilder()

                .addComponents(menu);

        await message.edit({

            embeds: [embed],

            components: [row]
        });

    } catch (err) {

        console.log(err);
    }
}

// =========================
// AUTO UPDATE
// =========================

setInterval(updateTracker, 15000);

// =========================
// INTERACTIONS
// =========================

client.on(
    'interactionCreate',

    async interaction => {

        // =========================
        // DROPDOWN
        // =========================

        if (
            interaction.isStringSelectMenu()
        ) {

            if (
                interaction.customId ===
                'staff_select'
            ) {

                const selected =
                    interaction.values[0];

                const lastSeen =
                    getLastSeen();

                const data =
                    lastSeen[selected];

                const embed =
                    new EmbedBuilder()

                        .setTitle(
                            `<:zzerio:1510284681931915284> Staff Information • ${selected}`
                        )

                        .setColor(
                            '#7CFF3B'
                        );

                if (!data) {

                    embed.setDescription(
                        'No tracking data available yet.'
                    );

                } else {

                    embed.addFields(
                        {
                            name:
                                'Status',

                            value:
                                data.online
                                    ? '<:online_discord:1510364784548380732> Online'
                                    : '<:offline_discord:1510364653941690490> Offline',

                            inline: true
                        },

                        {
                            name:
                                'Last Seen',

                            value:
                                data.online
                                    ? 'Currently Online'
                                    : `<t:${data.lastSeen}:F>\n(<t:${data.lastSeen}:R>)`,

                            inline: true
                        }
                    );
                }

                return interaction.reply({

                    embeds: [embed],

                    ephemeral: true
                });
            }
        }

        // =========================
        // COMMANDS
        // =========================

        if (
            !interaction.isChatInputCommand()
        ) return;

        if (
            interaction.user.id !==
            OWNER_ID
        ) {

            return interaction.reply({

                content:
                    'You are not allowed to use this command.',

                ephemeral: true
            });
        }

        // =========================
        // SETUP TRACKER
        // =========================

        if (
            interaction.commandName ===
            'setuptracker'
        ) {

            await interaction.reply({

                content:
                    'Creating live tracker...',

                ephemeral: true
            });

            const embed =
                new EmbedBuilder()

                    .setTitle(
                        '<:Zerio_Client_fidget:1510284681931915284> Zerio Staff Tracker'
                    )

                    .setDescription(
                        'Loading live staff data...'
                    )

                    .addFields({
                        name:
                            'Live Updates',

                        value:
                            'Automatically refreshed every 15 seconds.'
                    })

                    .setColor(
                        '#7CFF3B'
                    )

                    .setFooter({
                        text:
                            'Real-time staff activity monitoring'
                    })

                    .setTimestamp();

            const menu =
                new StringSelectMenuBuilder()

                    .setCustomId(
                        'staff_select'
                    )

                    .setPlaceholder(
                        'Select a staff member'
                    )

                    .addOptions(
                        getStaffList().map(
                            staff => ({
                                label: staff,
                                value: staff
                            })
                        )
                    );

            const row =
                new ActionRowBuilder()

                    .addComponents(menu);

            const msg =
                await interaction.channel.send({

                    embeds: [embed],

                    components: [row]
                });

            saveTrackerData({

                channelId:
                    interaction.channel.id,

                messageId:
                    msg.id
            });

            updateTracker();
        }

        // =========================
        // STAFF LIST UPDATE
        // =========================

        if (
            interaction.commandName ===
            'stafflistupdate'
        ) {

            const sub =
                interaction.options.getSubcommand();

            let staffList =
                getStaffList();

            if (sub === 'add') {

                const username =
                    interaction.options.getString(
                        'username'
                    );

                if (
                    staffList.includes(
                        username
                    )
                ) {

                    return interaction.reply({

                        content:
                            'That user already exists.',

                        ephemeral: true
                    });
                }

                staffList.push(username);

                saveStaffList(
                    staffList
                );

                return interaction.reply(
                    `Added ${username} to the staff list.`
                );
            }

            if (sub === 'remove') {

                const username =
                    interaction.options.getString(
                        'username'
                    );

                staffList =
                    staffList.filter(
                        name =>
                            name.toLowerCase() !==
                            username.toLowerCase()
                    );

                saveStaffList(
                    staffList
                );

                return interaction.reply(
                    `Removed ${username} from the staff list.`
                );
            }

            if (sub === 'list') {

                return interaction.reply({

                    content:
                        `Current Staff List:\n\n${staffList.join('\n')}`,

                    ephemeral: true
                });
            }
        }
    }
);

// =========================
// LOGIN
// =========================

client.login(TOKEN);
