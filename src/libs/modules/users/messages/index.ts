import crypto from 'crypto'
import { UploadedFile } from 'express-fileupload'
import sendMessageFromIdToId from './send-message-from-id-to-id'
import uploadToCloud from '../../storage/upload'
import { user as userGlobals } from '../../../../globals/importable/variables'
import {
  generateMessageId,
  setUserConnectionLastMessage
} from './utils/index'

import { IMessage } from '../../../../models/user/Connection'
import { UserConnection, User, SocketServerTask } from '../../../../models'
import { ISocketServerTask } from '../../../../models/servers/SocketServerTask'

const { MAX_ATTACHMENT_SIZE } = userGlobals.messages

export async function sendSystemMessageToGroup(
  groupId: string, message: string, participants: string[]
): Promise<void> {
  const messageObject:{
    _id: string,
    from: string,
    message: string,
    timestamp: number,
    attachments: string[]
  } = {
    _id: await generateMessageId(groupId),
    from: 'system',
    message,
    timestamp: Date.now(),
    attachments: []
  }
  await UserConnection.findByIdAndUpdate(groupId, {
    $push: {
      messages: messageObject
    }
  })

  async function setLastMessageForAll() {
    for (const userId of participants) {
      await setUserConnectionLastMessage({ userId, connectionId: groupId, messageObject })
    }
  }

  await setLastMessageForAll()
}

export async function createGroup(
  presetId: string,
  name: string,
  authId: string,
  groupImage: string,
  participants: string[]
): Promise<string> {
  let image = groupImage
  if (groupImage === 'default') {
    image = `${global.CDN}/assets/images/avatars/group.png`
  }
  // Validate name
  if (name.length < 3 || name.length > 50) {
    throw new Error(`Invalid name: ${name}`)
  }
  // Validate each user
  for (const i of participants) {
    const id = i
    let user = null
    try {
      user = await User.findById(id)
    } catch (e) {
      console.error(e)
    }
    if (!user) {
      throw new Error('A user from your list does not exist!')
    }
    if (
      user.control_panel
      && user.control_panel.disabled_messages === true
    ) {
      throw new Error(`${user.first_name} has disabled the messages!`)
    }
    if (
      user.control_panel
      && user.control_panel.profile_private === true
    ) {
      throw new Error(`${user.first_name} has made the profile private!`)
    }
  }
  // Get participants
  const usersParticipants = []

  // Store participants
  for (const i of participants) {
    const id = i
    usersParticipants.push({
      _id: id,
      admin: false
    })
  }

  // Push connection to database
  await new UserConnection({
    _id: presetId,
    name,
    image,
    type: 'group',
    statistics: {
      created_by: authId,
      created_at: Date.now()
    },
    // Set the admin
    users: [
      {
        _id: authId,
        admin: true
      },
      // Add participants
      ...usersParticipants
    ]
  }).save()

  const authUser = await User.findById(authId)

  if (!authUser) {
    throw new Error('User not found')
  }

  const allParticipants = [authId, ...participants]

  // Set connection for user
  for (const userId of allParticipants) {
    await User.findByIdAndUpdate(userId, {
      $set: {
        [`jama_messages.connections${presetId}.type`]: 'group'
      }
    }, { upsert: true })
  }

  await sendSystemMessageToGroup(presetId, `${authUser.first_name} ${authUser.last_name[0].toUpperCase()}. has created this group`, allParticipants)

  // Queue notification


  return presetId
}

export async function sendMessageToGroup(
  authId: string,
  connectionId: string,
  text = 'Attachment',
  attachments: UploadedFile[] = []
): Promise<void> {
  // Check connection
  const messageAttachments = []
  const connection = await UserConnection.findById(connectionId)
  if (!connection) {
    throw new Error('Invalid destination')
  }
  if (!connection.users) {
    throw new Error('This connection does not have participants')
  }

  const participants = connection.users

  if (!participants.find(object => object._id === authId)) {
    throw new Error('Unauthorized request!')
  }

  if (attachments.length) {
    const filesArray: UploadedFile[] = attachments
    // Check file size
    let error
    for (const file of filesArray) {
      if (file.size > MAX_ATTACHMENT_SIZE) {
        error = `"${file.name}" exceeded the size limit!`
        break
      }
    }

    if (error) {
      throw new Error(error)
    }

    // Upload
    for (const file of filesArray) {
      const safeFolder = `${crypto.randomBytes(24).toString('hex')}_${Date.now()}`
      const dldUrl = await uploadToCloud(file, `default:message_attachments/${connectionId}/${safeFolder}`)
      messageAttachments.push(dldUrl)
    }
  }

  // Send payload
  const messagePayload: Omit<IMessage, '_id'> = {
    from: authId,
    message: text,
    timestamp: Date.now(),
    attachments: []
  }
  if (messageAttachments.length) {
    messagePayload.attachments = messageAttachments
  }

  const task: Omit<ISocketServerTask, '_id'> = {
    task_type: 'send-message',
    task_data: JSON.stringify({
      room_id: connectionId,
      message_object: messagePayload
    }),
    timestamp: Date.now()
  }

  await new SocketServerTask(task).save()
}
export { default as sendMessageFromIdToId } from './send-message-from-id-to-id'

export default {
  createGroup,
  sendMessageToGroup,
  sendMessageFromIdToId
}
