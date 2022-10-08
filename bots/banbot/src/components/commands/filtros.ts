import { Composer, Markup } from 'telegraf'
import { prisma } from '../db/prisma.js'

const filtros = new Composer()

const my_id = process.env.ADMIN_ID!

filtros.on('new_chat_members', async (ctx) => {
  // get new members
  const new_members = ctx.message.new_chat_members
  for (const possibleSpammer of new_members) {
    const spammer = await prisma.user.findFirst({
      where: {
        id: possibleSpammer.id.toString(),
        permaban: true,
      },
    })
    if (spammer) {
      ctx.telegram
        .banChatMember(ctx.chat.id, possibleSpammer.id)
        .catch((e) => {
          console.log(e)
          ctx.reply('Error banning user from chat')
        })
    }
  }
})

filtros.on('message', async (ctx) => {
  const chatInDB = await prisma.chat.findUnique({
    where: {
      tgId: ctx.chat.id.toString(),
    },
    select: {
      antibot: true,
      messages: true,
    },
  })

  const chatId = ctx.chat.id.toString()

  await ctx.telegram
    .getChatAdministrators(chatId)
    .then(async (administrators) => {
      const isAdmin = administrators.some(member => member.user.id === ctx.from.id)
      if (!isAdmin) {
        // to avoid trying to delete the same message twice
        let alreadyDeleted = false

        // handle blacklist
        const filters = chatInDB?.messages

        if (filters && filters.length > 0) {
          for (let i = 0; i < filters.length; i++) {
            const message = filters[i]
            const regex = new RegExp(`^${message.text}$`, 'i')
            if (
              ('text' in ctx.message && ctx.message.text.match(regex))
              || ('caption' in ctx.message && ctx.message.caption?.match(regex))
            ) {
              // forward message to admin
              await ctx
                .forwardMessage(chatId)
                .catch(() => ctx.reply('Error forwarding the message'))

              // send message with details
              const spammer_id = ctx.message.from.id
              const info_text = `User with id <code>${spammer_id}</code> sent above message in chat with id <code>${chatId}</code>`
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

              // delete message and restrict user
              await ctx
                .deleteMessage()
                .then(async () => {
                  alreadyDeleted = true
                  await ctx
                    .restrictChatMember(ctx.from.id, {
                      permissions: {
                        can_send_messages: false,
                        can_invite_users: false,
                        can_send_polls: false,
                        can_send_media_messages: false,
                        can_send_other_messages: false,
                      },
                      until_date: Math.round(Date.now() / 1000) + 60 * 10,
                    })
                    .catch(e => console.log('Error muting the user ', e))
                })
                .catch(e => console.log('Error deleting the message in blacklist ', e))

              break
            }
          }
        }

        if (chatInDB?.antibot) {
          // handle antibot command
          const spam_text = 'text' in ctx.message
            ? ctx.message.text
            : 'caption' in ctx.message && ctx.message.caption
              ? ctx.message.caption
              : ''

          const regexpUnicodeModified = /\p{RI}\p{RI}|\p{Emoji}(\p{EMod}+|\u{FE0F}\u{20E3}?|[\u{E0020}-\u{E007E}]+\u{E007F})?(\u{200D}\p{Emoji}(\p{EMod}+|\u{FE0F}\u{20E3}?|[\u{E0020}-\u{E007E}]+\u{E007F})?)+|\p{EPres}(\p{EMod}+|\u{FE0F}\u{20E3}?|[\u{E0020}-\u{E007E}]+\u{E007F})?|\p{Emoji}(\p{EMod}+|\u{FE0F}\u{20E3}?|[\u{E0020}-\u{E007E}]+\u{E007F})/gu

          const noEmojiText = spam_text.replace(regexpUnicodeModified, '')

          const containsWeirdStuff = /[^a-zA-Z\s&\d:_/(){}\\]/gu.test(noEmojiText)

          // restrict user and delete message
          if (containsWeirdStuff) {
            await ctx
              .restrictChatMember(ctx.from.id, {
                permissions: {
                  can_send_messages: false,
                  can_invite_users: false,
                  can_send_polls: false,
                  can_send_media_messages: false,
                  can_send_other_messages: false,
                },
                until_date: Math.round(Date.now() / 1000) + 60 * 60,
              })
              .catch(e => console.log('Error muting the user ', e))

            if (!alreadyDeleted)
              ctx.deleteMessage().catch(e => console.log('Error deleting the message in blacklist ', e))
          }
        }
      }
    })
    .catch(() => ctx.reply(`Error getting administrators in chat with id ${chatId}`))
},
)

export default filtros
