import { UserInterests } from '../../../../models'

const Models = {
  UserInterests
}

async function removeUserInterest(userId: string, eventId: string): Promise<void> {
  await Models.UserInterests.findByIdAndUpdate(userId, {
    $pull: {
      interests: {
        _id: eventId
      }
    }
  })
}
async function addUserEventInterest(
  userId: string,
  timestamp: number,
  eventId: string
): Promise<any> {
  const hasValue = await Models.UserInterests.findById(userId)
  if (hasValue) {
    await Models.UserInterests.findByIdAndUpdate(userId, {
      $push: {
        interests: {
          _id: eventId,
          timestamp
        }
      }
    })
  } else {
    await new Models.UserInterests({
      _id: userId,
      interests: [{
        _id: eventId,
        timestamp
      }]
    }).save()
  }
}

export {
  addUserEventInterest,
  removeUserInterest
}
