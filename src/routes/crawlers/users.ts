import { Router } from 'express'
import frontEndRoutes from './vars/front-end-root-routes'
import detectCrawler from './functions/detect-crawler'
import { User } from '@florinrelea/sparc-shared/models'

const Model = {
  User
}

const router = Router()

const excludedRoutes = ['favicon.ico', 'sitemap.xml', 'robots.txt']

router.get('/:username', async (req, res, next) => {
  const { username } = req.params

  // Routes collision
  if (frontEndRoutes.includes(username) || excludedRoutes.includes(username)) {
    return next()
  }

  const isCrawler = detectCrawler(req)
  if (!isCrawler || isCrawler.crawlerType !== 'webCrawlers') return next()

  const html404Content = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Sparc | User not found!</title>
  </head>
  <body>
    <h1>Sparc | User not found!</h1>
  </body>
</html>`

  // Send data to web crawler (for search engines)
  let user

  res.set('Content-Type', 'text/html')

  try {
    user = await Model.User.findById(username)
  } catch (e) {
    return res.status(404).send(Buffer.from(html404Content))
  }

  if (
    !user
    || (user.control_panel && user.control_panel.profile_private === true)
  ) {
    return res.status(404).send(Buffer.from(html404Content))
  }

  const keywords = (() => {
    const nameKeywords = `${user.first_name} ${user.last_name}`.split(' ').join(',')
    const headlineKeywords = (user.headline || '').split(' ').join(',')
    const aboutSectionKeywordsArray = (user.about || '').replace(/\r?\n|\r/g, ' ').split(' ')
    const aboutSectionKeywords = aboutSectionKeywordsArray.splice(0, 20).join(',')
    return `${nameKeywords},${headlineKeywords},${aboutSectionKeywords}`
  })()

  const headline = user.headline || ''
  const about = (user.about || 'No description').replace(/\r?\n|\r/g, ' ')
  const fullName = `${user.first_name} ${user.last_name}`
  const title = `${fullName} - ${headline} | Sparc`

  const crawlerTemplate = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <meta name="description" property="description" content="${about}">
    <meta name="keywords" property="keywords" content="${keywords}">
    <meta name="og:url" property="og:url" content="https://sparc.world/${user._id}">
    <meta name="og:title" property="og:title" content="${title}">
    <meta name="og:site_name" property="og:site_name" content="Sparc">
    <meta name="og:description" property="og:description" content="${about}">
    <meta name="og:type" property="og:type" content="website">
    <meta name="og:image" property="og:image" content="https://s3.amazonaws.com/cdn.sparc.world/assets/logos/logo_sparc_500x500.png">
    <meta name="og:locale" property="og:locale" content="en_US">
  </head>
  <body>
    <h1>${fullName}</h1>
    <h2>${headline}</h2>
    <main>
      <p>${user.about}</p>
    </main>
  </body>
</html>`

  return res.status(200).send(Buffer.from(crawlerTemplate))
})

export default router
