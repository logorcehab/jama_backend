import crypto from 'crypto'
import { UploadedFile } from 'express-fileupload'
import {
  User,
  UserConnection,
  SocketServerTask
} from '../../../../models'
import { IMessage } from '../../../../models/user/Connection'
import uploadToCloud from '../../storage/upload'
import { user as userGlobals } from '../../../../globals/importable/variables'
import { generateMessageId } from './utils'

import createConnectionId from './generate-connection-id'
import { ISocketServerTask } from '../../../../models/servers/SocketServerTask'

const { MAX_ATTACHMENT_SIZE } = userGlobals.messages
const Models = {
  User,
  UserConnection
}

async function sendMessageFromIdToId(
  id1: string,
  id2: string,
  message: string,
  attachments: UploadedFile[]
): Promise<void> {
  // sessionId = sender
  if (!id1) {
    throw new Error('ID1 is invalid')
  }
  if (!id2) {
    throw new Error('ID2 is invalid')
  }
  if (!message) {
    throw new Error('Invalid text message')
  }
  let newConnDebugger = false
  // Message should be pushed before pushing the connection id into the user database
  const timestamp = Date.now()
  const targetUser = await Models.User.findById(id2)

  if (!targetUser) {
    throw new Error('Target user not found')
  }

  function checkIfSenderIsBlocked(user: any, userId: string) {
    if (user.block_messages_from_users) {
      if (user.block_messages_from_users.includes(userId)) {
        throw new Error('You have been blocked')
      }
    }
  }
  async function createConnection(calledId: string) {
    const connectionId = await createConnectionId()
    newConnDebugger = true
    await Models.User.findByIdAndUpdate(calledId, {
      $push: {
        'jama_messages.connections': {
          _id: connectionId,
          uid: id1
        }
      }
    })
    const newConnection = new Models.UserConnection({
      _id: connectionId,
      user_1: id1,
      user_2: calledId
    })
    await newConnection.save()
    return connectionId
  }
  async function checkConnection(uid: string): Promise<string> {
    const userDocument = await Models.User.findById(uid, 'jama_messages.connections')
    const connections = userDocument?.jama_messages?.connections || []
    let checker = false
    for (const tunnel of connections) {
      const connId = tunnel.uid
      if (connId === uid) {
        checker = true
        const messagesDocument = await Models.User.findById(uid).select('jama_messages')
        const messagesData = messagesDocument?.jama_messages
        if (!messagesData) {
          throw new Error('Messages not found')
        }
        return tunnel._id
      }
    }

    if (checker === false) {
      const tunnel = await createConnection(uid)
      return tunnel
    }

    return ''
  }
  async function sendTextMessage(tunnel: string, authUser: string, localText: string) {
    const messageId = await generateMessageId(tunnel)
    const systemMessage: IMessage = {
      _id: messageId,
      from: 'system',
      message,
      timestamp: Date.now(),
      attachments: []
    }

    let attachmentsLinks: string[] = []

    if (attachments.length !== 0) {
      // Validation
      let error
      for (const file of attachments) {
        if (file.size > MAX_ATTACHMENT_SIZE) {
          error = `"${file.name}" exceeded the file size limit!`
        }
      }
      if (error) {
        throw new Error(error)
      }

      const attachmentsUrls = []
      for (const file of attachments) {
        const safeFolder = `${crypto.randomBytes(24).toString('hex')}_${Date.now()}`
        const url = await uploadToCloud(file, `default:message_attachments/${tunnel}/${safeFolder}`)
        attachmentsUrls.push(url)
      }

      attachmentsLinks = attachmentsUrls
    }

    const messagePayload: Omit<IMessage, '_id' | 'timestamp'> = {
      from: authUser,
      message: localText,
      attachments: attachmentsLinks
    }

    const task: Omit<ISocketServerTask, '_id'> = {
      task_type: 'send-message',
      task_data: JSON.stringify({
        room_id: tunnel,
        message_object: messagePayload
      }),
      timestamp: Date.now()
    }

    await new SocketServerTask(task).save()
  }
  async function newConnectionDebugger(trigger: boolean, user: string, tunnel: string) {
    if (trigger === true) {
      await Models.User.findByIdAndUpdate(id1, {
        $set: {
          [`jama_messages.connections.${tunnel}`]: {
            uid: user
          }
        }
      })
    }
  }
  function checkUserControlPanel(cp: any) {
    if (cp.disabled_messages === true) {
      throw new Error('This user disabled the messages')
    }

    return true
  }
  checkIfSenderIsBlocked(targetUser, id1)
  checkUserControlPanel(targetUser.control_panel)
  const activeTunnel = await checkConnection(id2)
  await sendTextMessage(activeTunnel, id1, message)
  await newConnectionDebugger(newConnDebugger, id2, activeTunnel)
}

export default sendMessageFromIdToId
