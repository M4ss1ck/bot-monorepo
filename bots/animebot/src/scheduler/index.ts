import schedule from 'node-schedule'
import { prisma } from "../db/prisma.js"
import { logger } from '../logger/index.js'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime.js'

dayjs.extend(relativeTime)

export const scheduled = async (id: string, cronExpression: string | number | Date, func: () => void, text?: string) => {
    logger.info('adding new scheduled task\n', cronExpression)
    let jobText: string
    const job = getScheduled(id)
    if (job) {
        jobText = 'Job is already scheduled'
    } else {
        const newjob = schedule.scheduleJob(id, cronExpression, func)
        newjob && logger.success(`Job ${id} will run ${dayjs(newjob.nextInvocation()).fromNow()}`)
        jobText = newjob ? `Job ${id} will run ${dayjs(newjob.nextInvocation()).fromNow()}` : 'Job failed for unknown reasons. Developer bad'

        logger.info('Check if date is at least a day in a future or a cron expression to store job in db\n', dayjs(cronExpression).isAfter(dayjs().add(1, 'd')))
    }
    if (typeof cronExpression === 'string' || dayjs(cronExpression).isAfter(dayjs().add(1, 'd'))) {
        await prisma.job.upsert({
            create: {
                id: id,
                date: String(cronExpression),
                text: text ?? ''
            },
            update: {
                date: String(cronExpression),
                text: text ?? ''
            },
            where: {
                id: id
            }
        })
    }
    return jobText
}

export const getScheduled = (id: string) => {
    return schedule.scheduledJobs[id]
}