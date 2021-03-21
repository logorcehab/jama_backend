import { Router } from 'express'
// Models
import { User, Event } from '@florinrelea/sparc-shared/models'
import { IEvent } from '@florinrelea/sparc-shared/@types/models/event/Event'
import checkIfAuthentificated from '../../../../middlewares/check-if-authentificated'

const Models = {
  Event,
  User
}

const router = Router()

router.use(checkIfAuthentificated)

router.get('/month', async (req, res, next) => {
  try {
    if (!req.query || !req.query.y || !req.query.m) {
      return res.status(400).json({ error: 'Expected timestamp of the month' })
    }
    const year = Number(req.query.y)
    const month = Number(req.query.m)
    const daysCount = new Date(year, month, 0).getDate()
    const allEvents = await Models.Event.find({
      private: {
        $ne: true
      }
    }, '_id timestamp_start timestamp_end created_by event_name') || []

    const schedule = []
    for (let calendarDayIndex = 1; calendarDayIndex <= daysCount; calendarDayIndex += 1) {
      const day: {
        date: number
        weekDay: number
        schedule: Array<{
          event: Partial<IEvent>
          host: {
            name: string
            _id: string
          }
        }>
      } = {
        date: calendarDayIndex,
        weekDay: new Date(year, month, calendarDayIndex).getDay(),
        schedule: []
      }
      for (const event of allEvents) {
        const s = new Date(event.timestamp_start)
        const date = {
          y: s.getFullYear(),
          m: s.getMonth() + 1,
          d: s.getDate()
        }
        if (
          (date.y === year)
          && (date.m === month)
          && (date.d === calendarDayIndex)
        ) {
          const host = await Models.User.findOne({
            _id: event.created_by,
            'control_panel.profile_private': {
              $ne: true
            }
          }, '_id control_panel first_name last_name')
          if (!host) continue
          const task = {
            event: {
              event_name: event.event_name,
              _id: event._id,
              timestamp_start: event.timestamp_start
            },
            host: {
              name: `${host.first_name} ${host.last_name.charAt(0).toUpperCase()}.`,
              _id: host._id
            }
          }
          day.schedule.push(task)
        }
      }
      schedule.push(day)
    }
    return res.status(200).json({ schedule })
  } catch (e) {
    return next(e)
  }
})

export default router
