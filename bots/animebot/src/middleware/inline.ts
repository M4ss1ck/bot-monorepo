import { Composer, Markup } from 'telegraf'
import { logger } from '../logger'

const inline = new Composer()

inline.on('inline_query', async (ctx) => {
    const query = ctx.inlineQuery.query
    const response = [
        {
            title: `Search ${query}`,
            description: 'You can choose between internal DB or AniList API',
            message_text: `Searching ${query}`,
        },
    ]
    const markup = Markup.inlineKeyboard([
        [
            Markup.button.callback(
                'Search anime in AniList',
                `AnimPage1-${query}`,
            ),
        ],
        [
            Markup.button.callback(
                'Search character in AniList',
                `AnimPage1-${query}`,
            ),
        ],
    ])
    const recipes = response.map(({ title, description, message_text }) => ({
        type: 'article',
        id: title,
        title,
        description,
        // thumb_url: thumbnail,
        input_message_content: {
            message_text,
        },
        ...markup,
    }))

    return await ctx
        .answerInlineQuery(recipes as never, { cache_time: 5, is_personal: true })
        .catch(e => logger.error('ERROR WITH INLINE QUERY\n', e))
})

inline.on('chosen_inline_result', ({ chosenInlineResult }) => {
    logger.success('Chosen inline result:\n', chosenInlineResult)
})

export default inline