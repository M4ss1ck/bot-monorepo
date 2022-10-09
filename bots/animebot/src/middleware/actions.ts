import { Composer, Markup } from "telegraf"
import { prisma } from "../db/prisma.js"
import { Anime } from "@prisma/client"

import * as fs from 'fs/promises'

import { padTo2Digits } from "../utils/index.js"

const actions = new Composer()

actions.action(/animeInfo_\d+/i, async ctx => {
    const animeId = ctx.callbackQuery.data?.replace(/animeInfo_/i, '')
    if (animeId) {
        const anime = await prisma.anime.findUnique({
            where: {
                id: parseInt(animeId)
            }
        })

        const buttons = []

        buttons.push([
            Markup.button.callback('Season', `seasonAlert`),
            Markup.button.callback('➖', `seasonMinus_${animeId}`),
            Markup.button.callback('➕', `seasonPlus_${animeId}`)
        ])
        buttons.push([
            Markup.button.callback('Episode', `episodeAlert`),
            Markup.button.callback('➖', `episodeMinus_${animeId}`),
            Markup.button.callback('➕', `episodePlus_${animeId}`)
        ])

        const keyboard = Markup.inlineKeyboard(buttons)

        const text = anime ? `<b>Name:</b> ${anime.name}\n<b>Season:</b> ${anime.season}\n<b>Episode:</b> ${anime.episode}\n\n<b>Note:</b> ${anime.note && anime.note.length > 0 ? anime.note : '-'}\n\n<i>To edit, use the buttons or modify the following code:</i>\n<pre>/save ${anime.season} ${anime.episode} ${anime.name}\n${anime.note}</pre>` : '<b>Anime not found for this id</b>'

        ctx.replyWithHTML(text, keyboard)
    }
})

actions.action(/(season|episode)(Minus|Plus)_\d+/i, async ctx => {
    console.log(ctx.callbackQuery)
    const animeId = ctx.callbackQuery.data?.replace(/(season|episode)(Minus|Plus)_/i, '')
    const isSeason = /season(Minus|Plus)_/i.test(ctx.callbackQuery.data ?? '')
    const isMinus = /(season|episode)Minus_/i.test(ctx.callbackQuery.data ?? '')
    if (animeId) {
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
            Markup.button.callback('➖', `seasonMinus_${animeId}`),
            Markup.button.callback('➕', `seasonPlus_${animeId}`)
        ])
        buttons.push([
            Markup.button.callback('Episode', `episodeAlert`),
            Markup.button.callback('➖', `episodeMinus_${animeId}`),
            Markup.button.callback('➕', `episodePlus_${animeId}`)
        ])

        const keyboard = Markup.inlineKeyboard(buttons)

        const text = anime ? `<b>Name:</b> ${anime.name}\n<b>Season:</b> ${anime.season}\n<b>Episode:</b> ${anime.episode}\n\n<b>Note:</b> ${anime.note && anime.note.length > 0 ? anime.note : '-'}\n\n<i>To edit, use the buttons or modify the following code:</i>\n<pre>/save ${anime.season} ${anime.episode} ${anime.name}\n${anime.note}</pre>` : '<b>Anime not found for this id</b>'

        ctx.editMessageText(text, { ...keyboard, parse_mode: 'HTML' })
    }

})

actions.action(/(season|episode)Alert/i, ctx => {
    const type = /season/i.test(ctx.callbackQuery.data ?? '') ? 'season' : 'episode'
    ctx.answerCbQuery(`Use the ➖ and ➕ buttons to modify ${type}`)
})

actions.action(/txt_\d+/, async ctx => {
    const userId = ctx.callbackQuery.data?.replace(/txt_/i, '')
    const fileName = `${userId}.txt`

    const animes = await prisma.anime.findMany({
        where: {
            userId: userId
        }
    })

    const animelist = animes.map(anime => `${anime.name} [S${padTo2Digits(anime.season)}E${padTo2Digits(anime.episode)}]`).join('\n')

    await fs.writeFile(fileName, animelist)

    await ctx.replyWithDocument({ source: fileName, filename: `anime_${Date.now()}.txt` }, { caption: 'Your list of anime' })

    await fs.unlink(fileName)
})

export default actions