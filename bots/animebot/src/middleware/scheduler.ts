import { Composer, Markup } from "telegraf"
import { prisma } from "../db/prisma.js"
import { scheduled, getScheduled } from "../scheduler/index.js"
import { logger } from "../logger/index.js"
import { getAnime } from "anilist-service"
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime.js'

dayjs.extend(relativeTime)

export const scheduler = new Composer()

scheduler.command('now', async ctx => {
    ctx
        .reply(`${dayjs()} vs ${new Date()}`)
        .catch(e => logger.error(e))
})

scheduler.command('ping5', async ctx => {
    // const date = Date.now() + 5000
    const id = `ping5:${ctx.from.id}`
    const keyboard = Markup.inlineKeyboard([
        Markup.button.callback('Cancel', `cancel:${id}`)
    ])
    const jobText = await scheduled(id, `*/5 * * * * *`, () => {
        ctx
            .reply('Ping back', keyboard)
            .catch(e => logger.error(e))
    })
    logger.info(jobText)
})

scheduler.command('tping', async ctx => {
    const id = `tping:${ctx.from.id}`
    const keyboard = Markup.inlineKeyboard([
        Markup.button.callback('Cancel', `cancel:${id}`)
    ])
    const future = dayjs().add(15, 's')
    ctx
        .reply(`Should ping in 15s at ${future.toString()}`, keyboard)
        .catch(e => logger.error(e))
    const jobText = await scheduled(id, future.valueOf(), () => {
        ctx
            .reply(`Should have ping at ${future.toString()}`, keyboard)
            .catch(e => logger.error(e))
    })
    logger.info(jobText)
})

scheduler.action(/cancel:/i, async ctx => {
    ctx.answerCbQuery()
    const jobId = ctx.callbackQuery.data?.replace('cancel:', '') ?? ''
    const job = getScheduled(jobId)
    // logger.info(job)
    if (job) {
        job.cancel()
        await prisma.job.delete({
            where: {
                id: jobId
            }
        }).catch(() => logger.info('Couldn\'t delete job from DB'))

        ctx
            .reply(`Scheduled job "${jobId}" was canceled`)
            .catch(e => logger.error(e))
    } else {
        ctx
            .reply(`Error 404: Job not found`)
            .catch(e => logger.error(e))
    }
})

scheduler.action(/a_scheduler:/i, async ctx => {
    if (ctx.callbackQuery.data) {
        const [animeId, userId, date] = ctx.callbackQuery.data.replace('a_scheduler:', '').split(':')
        if (animeId && userId && date) {
            // check if it's the right user
            if (ctx.callbackQuery.from.id.toString() !== userId) {
                await ctx.answerCbQuery('This is not your list')
                return
            }

            await ctx.answerCbQuery()

            const anime = await getAnime(Number(animeId))

            const jobId = `${animeId}:${userId}`
            // console.log(dayjs(Number(date)))
            const jobText = await scheduled(jobId, /^\d+$/.test(date) ? Number(date) : date, () => {
                ctx.telegram.sendMessage(userId, `This is your reminder for anime ${anime.Media.title.english ?? 'n/a'}`)
            }, `This is your reminder for anime ${anime.Media.title.english ?? 'n/a'}`)

            !ctx.callbackQuery.inline_message_id
                ? ctx.telegram.sendMessage(userId, `Reminder for anime ${anime.Media.title.english ?? 'n/a'}\n${jobText}`)
                : ctx.editMessageCaption(`Reminder for anime ${anime.Media.title.english ?? 'n/a'}\n${jobText}`)
        }
    }
})

/**
 * Usage: /reminder <date or cron expression> - <text>
 */
scheduler.command('reminder', async ctx => {
    if (ctx.message.text) {
        const [date, text] = ctx.message.text.replace(/^\/reminder(@\w+)?\s/i, '').split(' - ')
        const userId = ctx.from.id
        if (text && userId && date) {
            const jobId = `${date}:${userId}`
            const keyboard = Markup.inlineKeyboard([
                Markup.button.callback('Cancel', `cancel:${jobId}`)
            ])
            // console.log(dayjs(Number(date)))
            const jobText = await scheduled(jobId, /^\d+$/.test(date) ? Number(date) : date, () => {
                ctx.telegram.sendMessage(userId, text)
            }, text)

            ctx.telegram.sendMessage(userId, `${text}\n${jobText}`, keyboard)
        }
    }
})