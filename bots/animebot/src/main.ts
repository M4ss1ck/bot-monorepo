import { Telegraf } from 'telegraf'
import { logger } from './logger/index.js'
import anime from './middleware/anime.js'
import commands from './middleware/commands.js'
// import users from './middleware/createUsers.js'
import actions from './middleware/actions.js'
import inline from './middleware/inline.js'

const bot = new Telegraf(process.env.BOT_TOKEN ?? '')

bot
    // .use(users)
    .use(anime)
    .use(commands)
    .use(actions)
    .use(inline)

const commandList = await bot.telegram
    .getMyCommands()
    .catch((e) => logger.error(e));

if (commandList && !commandList.some((command) => command.command === "myanime")) {
    bot.telegram.setMyCommands([
        { command: "myanime", description: "Show your stored anime" },
        {
            command: "save",
            description: "Add new anime to database",
        },
        {
            command: "anime",
            description: "Search anime in AniList",
        },
        {
            command: "character",
            description: "Search character in AniList",
        },
        {
            command: "animebd",
            description: "Search for characters with a birthday today.",
        },
        {
            command: "help",
            description: "Get help"
        }
    ]);
} else {
    logger.info("No need to update commands");
}

// Iniciar bot
bot.launch()
logger.success('BOT INICIADO')

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'))
process.once('SIGTERM', () => bot.stop('SIGTERM'))