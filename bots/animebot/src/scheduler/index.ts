import schedule from 'node-schedule'
// import { prisma } from "../db/prisma.js"
import { logger } from '../logger/index.js'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime.js'

dayjs.extend(relativeTime)

export const scheduled = (id: string, cronExpression: string | number | Date, func: () => void) => {
    logger.info('adding new scheduled task\n', cronExpression)
    let text: string
    const job = getScheduled(id)
    if (job) {
        text = 'Job is already scheduled'
    } else {
        const newjob = schedule.scheduleJob(id, cronExpression, func)
        newjob && logger.success(`Job ${id} will run ${dayjs(newjob.nextInvocation()).fromNow()}`)
        text = newjob ? `Job ${id} will run ${dayjs(newjob.nextInvocation()).fromNow()}` : 'Job failed for unknown reasons. Developer bad'
    }
    return text
}

export const getScheduled = (id: string) => {
    logger.success(`Job ${id} were going to run ${schedule.scheduledJobs[id] ? dayjs(schedule.scheduledJobs[id].nextInvocation()).fromNow() : '... actually never'}`)
    return schedule.scheduledJobs[id]
}