import { Composer } from 'telegraf'

const start = new Composer()

start.start(ctx => ctx.replyWithHTML('Hi'))

export default start
