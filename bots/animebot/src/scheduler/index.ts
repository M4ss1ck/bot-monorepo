import schedule from 'node-schedule'
import { logger } from '../logger/index.js'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime.js'

dayjs.extend(relativeTime)

export const scheduled = (id: string, cronExpression: string | number | Date, func: () => void) => {
    logger.info('adding new scheduled task\n', cronExpression)
    const job = schedule.scheduleJob(id, cronExpression, func)
    job && logger.success(`Job ${id} will run ${dayjs(job.nextInvocation()).fromNow()}`)
}

export const getScheduled = (id: string) => {
    logger.success(`Job ${id} were going to run ${schedule.scheduledJobs[id] ? dayjs(schedule.scheduledJobs[id].nextInvocation()).fromNow() : '... actually never'}`)
    return schedule.scheduledJobs[id]
}