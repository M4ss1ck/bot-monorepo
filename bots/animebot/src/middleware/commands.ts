import { Composer, Markup } from "telegraf"
import { prisma } from "../db/prisma.js"

import { padTo2Digits } from "../utils/index.js"

const commands = new Composer()

commands.command(['myanime', 'myanimes'], async (ctx) => {
    const animes = await prisma.anime.findMany({
        where: {
            userId: ctx.from.id.toString()
        }
    })

    if (animes.length > 0) {
        const animelist = animes.map(anime => `${anime.name} [S${padTo2Digits(anime.season)}E${padTo2Digits(anime.episode)}]`).join('\n')

        const text = `<b>Anime stored for you:</b>\n\n${animelist}`

        const keyboard = Markup.inlineKeyboard(
            animes.map(anime => Markup.button.callback(`More info on "${anime.name}"`, `animeInfo_${anime.id}`))
        )

        ctx.replyWithHTML(text, keyboard)
    }
    else {
        ctx.replyWithHTML('<i>No anime found on DB</i>\n\nAdd some!')
    }
})

commands.command('save', async ctx => {
    const regex = /^\/save (\d+) (\d+) (.+)([\r\n\u0085\u2028\u2029]+(.+)?)?/i
    if (regex.test(ctx.message.text)) {
        try {
            const matches = ctx.message.text.match(regex)
            if (matches) {
                const season = matches[1]
                const episode = matches[2]
                const name = matches[3]
                const note = matches[5] ?? ''

                await prisma.anime
                    .upsert({
                        where: {
                            name_userId: {
                                name: name.trim(),
                                userId: ctx.from.id.toString()
                            }
                        },
                        create: {
                            name: name.trim(),
                            season: parseInt(season),
                            episode: parseInt(episode),
                            note,
                            user: {
                                connectOrCreate: {
                                    where: {
                                        id: ctx.from.id.toString(),
                                    },
                                    create: {
                                        id: ctx.from.id.toString(),
                                    }
                                }
                            }
                        },
                        update: {
                            season: parseInt(season),
                            episode: parseInt(episode),
                            note,
                        }
                    })
                    .then(() => ctx.reply('Done'))
                    .catch((e) => {
                        console.log(e)
                        ctx.reply('Error creating/updating that record')
                    })
            }

        } catch (error) {
            console.log(error)
        }
    }
})

export default commands