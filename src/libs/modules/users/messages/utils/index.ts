import { v4 as uuidv4 } from 'uuid'
import { IUser } from '../../../../../models/user/User'
import { UserConnection, User } from '../../../../../models'
import { IMessage } from '../../../../../models/user/Connection'

async function generateMessageId(connectionId: string): Promise<string> {
  if (!connectionId) {
    throw new Error('Expected connection id!')
  }

  async function getMessagesIds() {
    const data = await UserConnection.findById(connectionId, 'messages')
    if (!data) {
      throw new Error('Messages not found')
    }
    const messages = data.messages || []
    const ids = messages.map(message => message._id)
    return ids
  }
  const takenIds = await getMessagesIds()
  let id = ''
  let exists = true
  while (exists) {
    id = uuidv4()
    if (!takenIds.includes(id)) {
      exists = false
    }
  }

  return id
}

async function setUserConnectionLastMessage(
  { userId, connectionId, messageObject }:
    {
      userId: string
      connectionId: string
      messageObject: IMessage
    }
): Promise<void> {
  await User.findByIdAndUpdate(userId, {
    $set: {
      [`jama_messages.connections.${connectionId}.last_message`]: messageObject
    }
  }, { upsert: true })
}

export {
  generateMessageId,
  setUserConnectionLastMessage
}
