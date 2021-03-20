import { Event, EventAnalytics, User } from '../../../../models'

const Models = {
  User,
  Event,
  EventAnalytics
}

export default {
  async addEventView(eid: string): Promise<void> {
    if (!eid) {
      throw new Error('Invalid event id!')
    }
    const now = new Date()
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
    const event = await Event.findById(eid)
    if (!event) {
      throw new Error('Event not found!')
    }
    let counter = 0

    const analytics = await Models.EventAnalytics.findById(event._id).select('views')

    if (!analytics) {
      throw new Error('Event views not found!')
    }

    const { views } = Object(analytics)

    if (views && views[date]) {
      counter = parseInt(views[date], 10)
    } else {
      await Models.EventAnalytics.findByIdAndUpdate(event._id, {
        $set: {
          [`views.${date}`]: 1
        }
      }, { upsert: true })
    }
    counter += 1
    await Models.EventAnalytics.findByIdAndUpdate(event._id, {
      $set: {
        [`views.${date}`]: counter
      }
    }, { upsert: true })
  }
}
