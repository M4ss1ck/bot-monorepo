import { Composer, Markup } from 'telegraf'
import { prisma } from '../db/prisma.js'

const actions = new Composer()

const my_id = process.env.ADMIN_ID ?? '123'

actions.action('del', ctx => ctx.deleteMessage())

actions.action(/pb/, Composer.acl(parseInt(my_id), async (ctx) => {
  // get spammer's id
  const spammer_id = ctx.callbackQuery.data!.replace('pb', '')
  // set permaban in BD
  await prisma.user.update({
    where: {
      id: spammer_id,
    },
    data: {
      permaban: true,
    },
  }).catch((e) => {
    console.log(e)
    ctx.reply('Error updating permaban state for current id')
  })

  // ban her/him from every group the bot is in (if possible)
  const groups = await prisma.chat.findMany()
  for (const group of groups) {
    const chatId = group.tgId
    // check if it's a group
    if (chatId.startsWith('-')) {
      // check if bot is admin there
      await ctx.telegram.getChatAdministrators(chatId)
        .then((administrators) => {
          const isAdmin = administrators.some(member => member.user.username === ctx.me && 'can_restrict_members' in member)

          // ban him/her
          isAdmin && ctx.telegram
            .banChatMember(chatId, parseInt(spammer_id))
            .catch(() => ctx.reply(`Error banning user from chat with id ${chatId}`))
        })
        .catch(() => ctx.reply(`Error getting administrators in chat with id ${chatId}`))
    }
  }

  const buttons = [
    [
      Markup.button.callback('Unban', `ub${spammer_id}`),
      Markup.button.callback('Ignore', 'del'),
    ],
  ]
  const keyboard = Markup.inlineKeyboard(buttons)

  ctx.editMessageText(`Banned user with id ${spammer_id}`, { ...keyboard })
}))

actions.action(/ub/, Composer.acl(parseInt(my_id), async (ctx) => {
  // get spammer's id
  const spammer_id = ctx.callbackQuery.data!.replace('ub', '')
  // remove permaban in BD
  await prisma.user.update({
    where: {
      id: spammer_id,
    },
    data: {
      permaban: false,
    },
  }).catch((e) => {
    console.log(e)
    ctx.reply('Error updating permaban state for current id')
  })

  // unban her/him from every group the bot is in (if possible)
  const groups = await prisma.chat.findMany()
  for (const group of groups) {
    const chatId = group.tgId
    // check if it's a group
    if (chatId.startsWith('-')) {
      // check if bot is admin there
      await ctx.telegram.getChatAdministrators(chatId)
        .then((administrators) => {
          const isAdmin = administrators.some(member => member.user.username === ctx.me && 'can_restrict_members' in member)

          // unban him/her
          isAdmin && ctx.telegram
            .unbanChatMember(chatId, parseInt(spammer_id))
            .catch(() => ctx.reply(`Error unbanning user from chat with id ${chatId}`))
        })
        .catch(() => ctx.reply(`Error getting administrators in chat with id ${chatId}`))
    }
  }

  ctx.editMessageText(`Unbanned user with id ${spammer_id}`)
}))

export default actions
