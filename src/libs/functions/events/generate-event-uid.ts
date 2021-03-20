import mongoose from 'mongoose'

import { Event, DeletedEvent } from '../../../models'

const Models = {
  Event,
  DeletedEvent
}

async function main(): Promise<string> {
  function generateId(): Promise<any | string> {
    const id = String(mongoose.Types.ObjectId())
    // eslint-disable-next-line no-use-before-define
    return approveId(id)
  }
  async function approveId(id: string): Promise<any | string> {
    const engagementExists = await Models.Event.findById(id, '_id')
    if (engagementExists) {
      return generateId()
    }
    const deletedEngagementExists = await Models.DeletedEvent.findById(id, '_id')
    if (deletedEngagementExists) {
      return generateId()
    }

    return id
  }

  const genId = await generateId()

  return genId
}

export default main
