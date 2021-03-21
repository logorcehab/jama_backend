import { Router } from 'express'
import { Event } from '@florinrelea/sparc-shared/models'

const Models = {
  Event
}

const router = Router()

/** Route used on
 * /engagements/confrimation/participant/:id
 */
router.get('/:eventId', async (req, res, next) => {
  const { eventId } = req.params

  let event = null
  try {
    event = await Models.Event.findById(eventId, '_id event_name event_image created_by timestamp_start timestamp_end settings')
  } catch (e) {
    return next(e)
  }

  if (!event) {
    return res.status(404).json({ error: 'Event not found!' })
  }
  return res.status(200).json({ event })
})

export default router
