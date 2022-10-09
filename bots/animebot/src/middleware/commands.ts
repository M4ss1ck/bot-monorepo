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

export default commands