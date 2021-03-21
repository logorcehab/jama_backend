import { Router } from 'express'
import { Tag, User, Event } from '@florinrelea/sparc-shared/models'

import detectCrawler from './functions/detect-crawler'
import sendEngagementCard from './functions/send-engagement-card'

const Models = {
  Event,
  User,
  Tag
}

const router = Router()

router.get('/:eventId', async (req, res, next) => {
  const isCrawler = detectCrawler(req)

  if (!isCrawler) return next()

  // If facebook thumbail
  if (isCrawler.crawlerType === 'sharePreviewCrawlers') {
    return sendEngagementCard(req, res, next, req.params.eventId)
  }

  // Send data to web crawler (for search engines)

  const html404Content = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Sparc | Engagement not found!</title>
  </head>
  <body>
    <h1>Sparc | Engagement not found!</h1>
  </body>
</html>`

  res.set('Content-Type', 'text/html')

  const { eventId } = req.params
  let event
  try {
    event = await Models.Event.findOne({
      _id: eventId,
      private: {
        $ne: true
      }
    })
  } catch (e) {
    return res.status(404).send(html404Content)
  }

  if (!event) {
    return res.status(404).send()
  }

  let host

  try {
    host = await Models.User.findById(event.created_by)
  } catch (e) {
    return res.status(404).send(html404Content)
  }

  if (
    !host
    || (host.control_panel && host.control_panel.profile_private === true)
  ) {
    return res.status(404).send(html404Content)
  }

  const hostPublicName = `${host.first_name} ${host.last_name[0].toUpperCase()}.`

  // Convert event tags
  const finalTags = []
  const rawTags = event.tags

  for (const tagId of rawTags) {
    try {
      const tag = await Models.Tag.findById(tagId)
      if (tag) {
        finalTags.push(tag.value)
      }
    } catch (e) {
      console.error(e)
    }
  }

  event.tags = finalTags

  const keywords = (() => {
    const tagsKeywords = event.tags.join(',')
    const keywordsTitle = event.event_name.split(' ').join(',')
    const keywordsDescriptionArray = (event.event_description || '').replace(/\r?\n|\r/g, ' ').split(' ')
    const keywordsDescription = keywordsDescriptionArray.slice(0, 20).join(',')

    return `${tagsKeywords},${keywordsTitle},${keywordsDescription}`
  })()

  const description = event.event_description.replace(/\r?\n|\r/g, ' ')

  const title = `${event.event_name} | Sparc`

  const crawlerTemplate = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <meta name="description" property="description" content="${description}">
    <meta name="keywords" property="keywords" content="${keywords}">
    <meta name="og:url" property="og:url" content="https://sparc.world/engagements/${event._id}">
    <meta name="og:title" property="og:title" content="${title}">
    <meta name="og:site_name" property="og:site_name" content="Sparc">
    <meta name="og:description" property="og:description" content="${description}">
    <meta name="og:type" property="og:type" content="website">
    <meta name="og:image" property="og:image" content="https://s3.amazonaws.com/cdn.sparc.world/assets/logos/logo_sparc_500x500.png">
    <meta name="og:locale" property="og:locale" content="en_US">
  </head>
  <body>
    <h1>${event.event_name}</h1>
    <h2>Hosted By: ${hostPublicName}</h2>
    <h3>Description</h3>
    <main>
      <p>${event.event_description}</p>
    </main>
  </body>
</html>`
  res.set('Content-Type', 'text/html')
  return res.status(200).send(Buffer.from(crawlerTemplate))
})

export default router
