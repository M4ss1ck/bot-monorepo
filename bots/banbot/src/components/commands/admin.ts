import { Composer, Markup } from 'telegraf'
import { prisma } from '../db/prisma.js'

const admin = new Composer()

const my_id = process.env.ADMIN_ID ?? '123'

admin.command('antibot', Composer.admin(async (ctx) => {
  const chatId = ctx.chat.id.toString()

  const option = ctx.message.text.replace(/\/antibot(\s)?/, '')
  if (option === 'on' || option === 'off') {
    await prisma.chat
      .upsert({
        where: {
          tgId: chatId,
        },
        update: {
          antibot: option === 'on',
        },
        create: {
          tgId: chatId,
          antibot: option === 'on',
        },
      })
      .then(() => ctx.replyWithHTML(`Antibot was set to <b>${option}</b> in this chat`))
      .catch(() => ctx.reply('Error changing antibot property for this chat'))
  }
  else if (option.length > 0) {
    ctx.replyWithHTML('You need to provide valid options:\n<code>/antibot on</code>   or   <code>/antibot off</code>')
  }
  else {
    await prisma.chat.findUnique({
      where: {
        tgId: chatId,
      },
    }).then(chat => ctx.replyWithHTML(`Antibot is currently <b>${chat?.antibot ? 'on' : 'off'}</b> for this chat`))
  }
}))

admin.command('clearblocklist', Composer.admin(async (ctx) => {
  const chatId = ctx.chat.id.toString()

  await prisma.message
    .deleteMany({
      where: {
        chatId,
      },
    })
    .then(() => ctx.reply('Blocklist cleared'))
    .catch(() => ctx.reply('Error cleaning blocklist for this chat'))
}))

admin.command(
  'admin',
  Composer.acl(parseInt(my_id), (ctx) => {
    ctx.reply('You are admin of this bot')
  }),
)

admin.command(
  'pb',
  Composer.admin(async (ctx) => {
    const chat_id = ctx.chat.id

    // check if there's a replied message
    if (ctx.message.reply_to_message && ctx.message.reply_to_message.from) {
      const spammer_id = ctx.message.reply_to_message.from.id
      const time = Math.round(Date.now() / 1000) + 60 * 60 * 24

      // add user to db
      await prisma.user.upsert({
        where: {
          id: spammer_id.toString(),
        },
        update: {},
        create: {
          id: spammer_id.toString(),
          date: new Date(),
        },
      }).catch(() => ctx.reply('Error adding user to database'))
      // ban for 24h
      ctx.telegram
        .banChatMember(chat_id, spammer_id, time)
        .catch(() => ctx.reply('Error kicking user'))

      // choose message text or caption
      const spam_text = 'text' in ctx.message.reply_to_message
        ? ctx.message.reply_to_message.text
        : 'caption' in ctx.message.reply_to_message && ctx.message.reply_to_message.caption
          ? ctx.message.reply_to_message.caption
          : ''

      // add to blocklist
      await prisma.message.create({
        data: {
          text: spam_text,
          sender: {
            connect: {
              id: spammer_id.toString(),
            },
          },
          chat: {
            connectOrCreate: {
              where: {
                tgId: ctx.chat.id.toString(),
              },
              create: {
                tgId: ctx.chat.id.toString(),
              },
            },
          },
        },
      }).catch(() => ctx.reply('Error adding message to blocklist'))

      // forward message to admin
      await ctx.telegram
        .forwardMessage(my_id, chat_id, ctx.message.reply_to_message.message_id)
        .catch(() => ctx.reply('Error forwarding the message'))

      // send message with details
      const info_text = `User with id <code>${spammer_id}</code> sent above message in chat with id <code>${chat_id}</code>`
      const buttons = [
        [
          Markup.button.callback('Permaban', `pb${spammer_id}`),
          Markup.button.callback('Ignore', 'del'),
        ],
      ]
      const keyboard = Markup.inlineKeyboard(buttons)
      await ctx.telegram
        .sendMessage(my_id, info_text, { parse_mode: 'HTML', ...keyboard })
        .catch(() => ctx.reply('Error sending message to bot admin'))

      // delete messages
      ctx.telegram
        .deleteMessage(chat_id, ctx.message.reply_to_message.message_id)
        .then(() => ctx.deleteMessage())
        .catch(() => ctx.reply('Error deleting the message'))
    }
  }),
)

export default admin
