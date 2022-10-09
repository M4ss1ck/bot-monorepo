import { Telegraf } from 'telegraf'
import anime from './middleware/anime.js'
import commands from './middleware/commands.js'
// import users from './middleware/createUsers.js'
import actions from './middleware/actions.js'

const bot = new Telegraf(process.env.BOT_TOKEN ?? '')

bot
    // .use(users)
    .use(anime)
    .use(commands)
    .use(actions)

// Iniciar bot
bot.launch()
console.log('BOT INICIADO')

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'))
process.once('SIGTERM', () => bot.stop('SIGTERM'))