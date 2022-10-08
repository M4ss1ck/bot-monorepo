import { Telegraf } from 'telegraf'
import filters from './components/commands/filtros.js'
import admin from './components/commands/admin.js'
import actions from './components/actions/index.js'
import chats from './components/commands/createChat.js'
import start from './components/commands/start.js'

const bot = new Telegraf(process.env.BOT_TOKEN ?? '')

bot
  .use(start)
  .use(chats)
  .use(admin)
  .use(actions)
  .use(filters)

// Iniciar bot
bot.launch()
console.log('BOT INICIADO')

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'))
process.once('SIGTERM', () => bot.stop('SIGTERM'))
