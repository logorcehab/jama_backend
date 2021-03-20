import { Event } from '../../../../models'

const earnings = {
  async increment({ eventId, amount }: { eventId: string, amount: number }): Promise<void> {
    if ((typeof amount !== "number")) {
      throw new Error(`Expected amount type number, received: ${typeof amount}`)
    }
    await Event.findByIdAndUpdate(eventId, {
      $inc: { earnings: amount }
    }, { upsert: true })
  }
}

export default earnings
