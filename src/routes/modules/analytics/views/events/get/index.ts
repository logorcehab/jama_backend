import passport from 'passport';
import { Router } from 'express'
import { Event, EventAnalytics } from '../../../../../../models'
import { IEventAnalytics } from '../../../../../../models/event/Analytics'

const Models = {
  Event,
  EventAnalytics
}

const router = Router()


router.get('/all/:id', passport.authenticate('basic', { session: false }), async (req, res, next) => {
  try {
    const eventId = req.params.id
    const authId = res.locals.user
    const event = await Models.Event.findById(eventId)
    if (!event) {
      return res.status(404).json({ error: 'Error not found!' })
    }
    if (event.created_by !== authId) {
      return res.status(401).json({ error: 'You are not the host!' })
    }
    const data: {
      [key: string]: number
    } = {}
    let viewsByTimestamp: IEventAnalytics['views'] = {}

    // Get all views from database
    let analytics
    try {
      analytics = await Models.EventAnalytics.findById(event._id, 'views')
      if (analytics && analytics.views) {
        viewsByTimestamp = analytics.views
      }
    } catch (e) {
      return next(e)
    }

    // Check if has creation time
    const createdAt = event.creation.timestamp
    if (createdAt) {
      data[createdAt] = 0
    } else if (viewsByTimestamp) {
      const oneDay = 86400000
      const firstDay = Object.keys(viewsByTimestamp)[0]
      data[String(Number(firstDay) - oneDay)] = 0
    }
    if (!viewsByTimestamp) {
      data[Date.now()] = 0
      return res.status(200).json({ data })
    }

    // Sort
    let finalData = {}
    if (viewsByTimestamp) {
      const sorted = Object.keys(viewsByTimestamp).sort((a, b) => Number(a) - Number(b))
      sorted.forEach(timestamp => {
        finalData = { ...finalData, [timestamp]: viewsByTimestamp[timestamp] }
      })
    }
    return res.status(200).json({ data: finalData })
  } catch (e) {
    return next(e)
  }
})
router.get('/today/id/:id', passport.authenticate('basic', { session: false }), async (req, res, next) => {
  try {
    const eid = req.params.id
    const now = new Date()
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
    const analytics = await Models.EventAnalytics.findById(eid).select('views')
    let views
    if (analytics && analytics.views && analytics.views[date]) {
      views = analytics.views[date]
    }

    if (!views) { views = 0 }

    return res.status(200).json({ status: 'success', views })
  } catch (e) {
    return next(e)
  }
})
router.get('/week/id/:id',  passport.authenticate('basic', { session: false }),async (req, res, next) => {
  try {
    const eid = req.params.id
    const now = new Date()
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()

    const analytics = await Models.EventAnalytics.findById(eid).select('views')

    const days = (analytics || {}).views
    let views = 0
    if (!days) {
      views = 0
    } else {
      for (let i = 0; i < 7; i += 1) {
        const target = date - (86400000 * i)
        if (days[target]) {
          views += days[target]
        }
      }
    }

    return res.status(200).json({ views })
  } catch (e) {
    return next(e)
  }
})
router.get('/total/id/:id',  passport.authenticate('basic', { session: false }), async (req, res, next) => {
  try {
    const eid = req.params.id
    const analytics = await Models.EventAnalytics.findById(eid).select('views')
    const days = (analytics || {}).views
    let views = 0
    if (days) {
      Object.keys(days).forEach(day => {
        const vws = days[day]
        views += vws
      })
    }

    return res.status(200).json({ views })
  } catch (e) {
    return next(e)
  }
})

export default router
