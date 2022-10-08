import { Composer } from 'telegraf'
import { prisma } from '../db/prisma.js'

const chats = new Composer()

chats.use(async (ctx, next) => {
  if (ctx.chat) {
    await prisma.chat.upsert({
      where: {
        tgId: ctx.chat.id.toString(),
      },
      update: {},
      create: {
        tgId: ctx.chat.id.toString(),
      },
    }).catch(e => console.log('Error with upsert creating chat ', e))
  }
  return next()
})

export default chats
