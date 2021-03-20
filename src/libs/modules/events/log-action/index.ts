import { EventLogs } from '../../../../models'

const Models = {
  EventLogs
}

async function logEventAction(eventId: string, value: string): Promise<void> {
  const hasLogs = await Models.EventLogs.findById(eventId)
  if (!hasLogs) {
    await new Models.EventLogs({
      _id: eventId,
      logs: [{
        timestamp: Date.now(),
        value
      }]
    }).save()
  } else {
    await Models.EventLogs.findByIdAndUpdate(eventId, {
      $push: {
        logs: {
          timestamp: Date.now(),
          value
        }
      }
    })
  }
}

export default logEventAction
