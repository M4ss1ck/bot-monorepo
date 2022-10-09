import { Telegraf } from 'telegraf'
import anime from './middleware/anime.js'

const bot = new Telegraf(process.env.BOT_TOKEN ?? '')

bot.use(anime)

// Iniciar bot
bot.launch()
console.log('BOT INICIADO')

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'))
process.once('SIGTERM', () => bot.stop('SIGTERM'))