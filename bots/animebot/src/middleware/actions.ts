import { Composer, Markup } from "telegraf"
import { prisma } from "../db/prisma.js"
import { Anime } from "@prisma/client"

import * as fs from 'fs/promises'

import { padTo2Digits } from "../utils/index.js"

const actions = new Composer()

actions.action(/animeInfo_\d+_\d+/i, async ctx => {
    if (ctx.callbackQuery.data) {
        const [animeId, userId] = ctx.callbackQuery.data.replace(/animeInfo_/i, '').split('_')
        if (animeId && userId) {
            // check if it's the right user
            if (ctx.callbackQuery.from.id.toString() !== userId) {
                await ctx.answerCbQuery('This is not your list')
                return
            }

            await ctx.answerCbQuery()

            const anime = await prisma.anime.findUnique({
                where: {
                    id: parseInt(animeId)
                }
            })

            const buttons = []

            buttons.push([
                Markup.button.callback('Season', `seasonAlert`),
                Markup.button.callback('➖', `seasonMinus_${animeId}_${userId}`),
                Markup.button.callback('➕', `seasonPlus_${animeId}_${userId}`)
            ])
            buttons.push([
                Markup.button.callback('Episode', `episodeAlert`),
                Markup.button.callback('➖', `episodeMinus_${animeId}_${userId}`),
                Markup.button.callback('➕', `episodePlus_${animeId}_${userId}`)
            ])

            const keyboard = Markup.inlineKeyboard(buttons)

            const text = anime ? `<b>Name:</b> ${anime.name}\n<b>Season:</b> ${anime.season}\n<b>Episode:</b> ${anime.episode}\n\n<b>Note:</b> ${anime.note && anime.note.length > 0 ? anime.note : '-'}\n\n<i>To edit, use the buttons or modify the following code:</i>\n<pre>/save ${anime.season} ${anime.episode} ${anime.name}\n${anime.note}</pre>` : '<b>Anime not found for this id</b>'

            ctx.replyWithHTML(text, keyboard)
        }
    }
})

actions.action(/(season|episode)(Minus|Plus)_\d+_\d+/i, async ctx => {
    if (ctx.callbackQuery.data) {
        const [animeId, userId] = ctx.callbackQuery.data.replace(/(season|episode)(Minus|Plus)_/i, '').split('_')
        const isSeason = /season(Minus|Plus)_/i.test(ctx.callbackQuery.data ?? '')
        const isMinus = /(season|episode)Minus_/i.test(ctx.callbackQuery.data ?? '')
        if (animeId && userId) {
            // check if it's the right user
            if (ctx.callbackQuery.from.id.toString() !== userId) {
                await ctx.answerCbQuery('This is not your anime')
                return
            }

            await ctx.answerCbQuery()

            let anime: Anime | null
            if (isSeason && isMinus) {
                anime = await prisma.anime.update({
                    where: {
                        id: parseInt(animeId)
                    },
                    data: {
                        season: {
                            decrement: 1
                        }
                    }
                })
            }
            else if (isSeason) {
                anime = await prisma.anime.update({
                    where: {
                        id: parseInt(animeId)
                    },
                    data: {
                        season: {
                            increment: 1
                        }
                    }
                })
            }
            else if (isMinus) {
                anime = await prisma.anime.update({
                    where: {
                        id: parseInt(animeId)
                    },
                    data: {
                        episode: {
                            decrement: 1
                        }
                    }
                })
            }
            else {
                anime = await prisma.anime.update({
                    where: {
                        id: parseInt(animeId)
                    },
                    data: {
                        episode: {
                            increment: 1
                        }
                    }
                })
            }

            const buttons = []

            buttons.push([
                Markup.button.callback('Season', `seasonAlert`),
                Markup.button.callback('➖', `seasonMinus_${animeId}_${userId}`),
                Markup.button.callback('➕', `seasonPlus_${animeId}_${userId}`)
            ])
            buttons.push([
                Markup.button.callback('Episode', `episodeAlert`),
                Markup.button.callback('➖', `episodeMinus_${animeId}_${userId}`),
                Markup.button.callback('➕', `episodePlus_${animeId}_${userId}`)
            ])

            const keyboard = Markup.inlineKeyboard(buttons)

            const text = anime ? `<b>Name:</b> ${anime.name}\n<b>Season:</b> ${anime.season}\n<b>Episode:</b> ${anime.episode}\n\n<b>Note:</b> ${anime.note && anime.note.length > 0 ? anime.note : '-'}\n\n<i>To edit, use the buttons or modify the following code:</i>\n<pre>/save ${anime.season} ${anime.episode} ${anime.name}\n${anime.note}</pre>` : '<b>Anime not found for this id</b>'

            ctx.editMessageText(text, { ...keyboard, parse_mode: 'HTML' })
        }
    }

})

actions.action(/(season|episode)Alert/i, ctx => {
    const type = /season/i.test(ctx.callbackQuery.data ?? '') ? 'season' : 'episode'
    ctx.answerCbQuery(`Use the ➖ and ➕ buttons to modify ${type}`, { show_alert: true })
})

actions.action(/txt_\d+/, async ctx => {
    await ctx.answerCbQuery()
    const userId = ctx.callbackQuery.data?.replace(/txt_/i, '')
    const fileName = `${userId}.txt`

    if (userId !== ctx.callbackQuery.from.id.toString()) {
        ctx.answerCbQuery('This is not your list')
    }
    else {
        const animes = await prisma.anime.findMany({
            where: {
                userId: userId
            }
        })

        const animelist = animes.map(anime => `${anime.name} [S${padTo2Digits(anime.season)}E${padTo2Digits(anime.episode)}] ${anime.note ?? ''}`).join('\n')

        await fs.writeFile(fileName, animelist)

        await ctx.replyWithDocument({ source: fileName, filename: `anime_${Date.now()}.txt` }, { caption: 'Your list of anime' })

        await fs.unlink(fileName)
    }
})

actions.action(/myanime_\d+_\d+/i, async ctx => {
    if (ctx.callbackQuery.data) {
        const [page, userId] = ctx.callbackQuery.data.replace(/myanime_/i, '').split('_')
        if (page && userId) {
            // check if it's the right user
            if (ctx.callbackQuery.from.id.toString() !== userId) {
                console.log(userId, ctx.callbackQuery.from.id.toString())
                ctx.answerCbQuery('This is not your anime')
                return
            }

            const skip = (parseInt(page) - 1) * 10

            const animes = await prisma.anime.findMany({
                where: {
                    userId: userId
                },
                take: 10,
                skip: skip
            })

            const animelist = animes.map(anime => `<i>${anime.name}</i> <b>[S${padTo2Digits(anime.season)}E${padTo2Digits(anime.episode)}]</b>`).join('\n')

            const text = `<b>Anime stored for you:</b>\n\n${animelist}`

            const buttons = animes.map(anime => [Markup.button.callback(`More info on "${anime.name}"`, `animeInfo_${anime.id}_${userId}`)])

            buttons.push([
                Markup.button.callback('⏮', `myanime_${parseInt(page) - 1}_${userId}`, parseInt(page) < 2),
                Markup.button.callback('⏭', `myanime_${parseInt(page) + 1}_${userId}`, animes.length < 10)
            ])

            buttons.push([
                Markup.button.callback('💾 Export .txt 💾', `txt_${userId}`),
            ])

            const keyboard = Markup.inlineKeyboard(buttons)

            ctx.editMessageText(text, { ...keyboard, parse_mode: 'HTML' })
        }
    }
})

export default actions