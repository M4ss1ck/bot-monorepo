import { prisma } from "../db/prisma.js"
import { scheduled } from "../scheduler/index.js"
import type { Telegraf } from "telegraf"
import { logger } from "../logger/index.js"

export const padTo2Digits = (num: number) => {
    return num.toString().padStart(2, '0')
}

export const convertMsToTime = (milliseconds: number) => {
    let seconds = Math.floor(milliseconds / 1000)
    let minutes = Math.floor(seconds / 60)
    let hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)

    seconds = seconds % 60
    minutes = minutes % 60
    hours = hours % 24

    return `${days}:${padTo2Digits(hours)}:${padTo2Digits(minutes)}:${padTo2Digits(
        seconds,
    )}`
}

export const convertMsToRelativeTime = (milliseconds: number) => {
    let seconds = Math.floor(milliseconds / 1000)
    let minutes = Math.floor(seconds / 60)
    let hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)

    seconds = seconds % 60
    minutes = minutes % 60
    hours = hours % 24

    return `${days > 0 ? days + ' day(s) ' : ''}${hours > 0 ? hours + ' h ' : ''}${minutes > 0 ? minutes + ' min ' : ''}${seconds > 0 ? seconds + ' s' : ''}`
}

export const runScheduled = async (bot: Telegraf) => {
    const jobs = await prisma.job.findMany()
    for (const job of jobs) {
        const [, userId] = job.id.split(':')
        const jobText = await scheduled(job.id, /^\d+$/.test(job.date) ? Number(job.date) : job.date, () => {
            bot.telegram.sendMessage(userId, job.text)
        }, job.text)
        logger.success(jobText, '\n', job.text)
    }
}