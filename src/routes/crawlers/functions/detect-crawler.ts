import { Request } from 'express'
import crawlerTypes from '../vars/web-crawlers'

function detectCrawler(req: Request): false | {
  crawlerType: string | null
  crawlerName: string | null
} {
  if (!req || !req.headers || !req.headers['user-agent']) return false
  const userAgent = req.headers['user-agent']

  let crawlerType = null
  let crawlerName = null

  for (const type in crawlerTypes) {
    const crawlers = crawlerTypes[type]
    for (const name of Object.keys(crawlers)) {
      const crawlerAgent = crawlers[name]
      for (const agent of crawlerAgent) {
        if (userAgent.includes(agent)) {
          crawlerType = type
          crawlerName = name
        }
      }
    }
  }
  if (!crawlerName) return false
  console.table([{
    LOG: 'Crawler', TYPE: crawlerType, FROM: crawlerName, ROUTE: req.originalUrl, TIMESTAMP: Date.now()
  }])
  return { crawlerType, crawlerName }
}

export default detectCrawler
