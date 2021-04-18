import { Router } from 'express'
import uploader, { UploadedFile } from 'express-fileupload'
import { sendMessageToGroup, sendMessageFromIdToId, createGroup } from '../../../../../libs/modules/users/messages'
import generateConnectionId from '../../../../../libs/modules/users/messages/generate-connection-id'

// Models
import { User, UserConnection, Event } from '../../../../../models'
import { IEventDocument } from '../../../../../models/event/Event'

const Models = {
  User,
  UserConnection,
  Event
}

const router = Router()

router.post('/post/bulk-message/:eventId', uploader({ limits: { files: 5 } }), async (req, res, next) => {
  const authId = res.locals.user
  const { eventId } = req.params
  const b = req.body
  if (!b) {
    const e = 'wrong request body'
    console.log(e)
    return res.status(400).json({ error: e })
  }

  let attachments: UploadedFile[] = []
  if (req.files) {
    attachments = Array.isArray(req.files.attachments)
      ? req.files.attachments.slice(0, 5) : [req.files.attachments]
  }

  if (!b.message) {
    const e = 'Expected message!'
    console.log(e)
    return res.status(400).json({ error: e })
  }
  if (!b.dest) {
    return res.status(400).json({ error: 'Expected destination!' })
  }

  let shouldCreateGroup = false
  let groupName = ''
  // Check if create group is required
  if (b.createGroup === 'true') {
    shouldCreateGroup = true
    groupName = b.groupName
    if (!groupName || groupName.length < 3 || groupName.length > 50) {
      return res.status(400).json({ error: 'Invalid group name!' })
    }
  }

  const { message } = b
  let dest: string[] = []
  try {
    dest = JSON.parse(b.dest)
  } catch (e) {
    return next(e)
  }
  if (dest.length < 1) {
    const e = 'Bulk Message requires 1 or more user destinations'
    console.log(e)
    return res.status(400).json({ error: e })
  }

  // Validate users ids
  let event: IEventDocument
  try {
    event = await Models.Event.findById(eventId)
  } catch (e) {
    return next(e)
  }

  if (!event) {
    return res.status(404).json({ error: 'Event not found' })
  }

  const hasOneInvalidRecipient = dest.some(recipientId => !event.users_attending.find(el => el === recipientId))

  if (hasOneInvalidRecipient) {
    return res.status(401).json({ error: 'One or more recipients are invalid' })
  }

  // Bulk message + create group
  const createGroupAndSendMessage = async () => {
    // Validate
    for (const i in dest) {
      const id = dest[i]
      let u
      try {
        u = await Models.User.findOne({
          _id: id,
          'control_panel.disabled_messages': {
            $ne: true
          }
        })
      } catch (e) {
        delete dest[i]
      }
      if (!u) {
        delete dest[i]
        continue
      }
    }
    dest = dest.filter(id => id != null)
    // Get id first

    const groupId = await generateConnectionId()
    await createGroup(groupId, groupName, authId, 'default', dest)
    await sendMessageToGroup(authId, groupId, message, attachments)
  }
  // Default bulk message
  const sendDefaultBulkMessage = async () => {
    // Users destination validation
    for (const i in dest) {
      const id = dest[i]
      let ck = null
      try {
        ck = await Models.User.exists({
          _id: id,
          'control_panel.disabled_messages': {
            $ne: true
          }
        })
      } catch (e) {
        console.error(e)
        ck = null
      }
      if (!ck) {
        delete dest[i]
        dest = dest.filter(el => el != null)
      }
    }
    if (!dest.length) {
      return res.status(401).json({ error: 'None of these users are available!' })
    }
    for (const i in dest) {
      const id = dest[i]
      await sendMessageFromIdToId(authId, id, message, attachments)
    }
    return true
  }
  if (shouldCreateGroup === true) {
    try {
      await createGroupAndSendMessage()
    } catch (e) {
      return res.status(500).json({ error: e.message })
    }
  } else {
    try {
      await sendDefaultBulkMessage()
    } catch (e) {
      return res.status(500).json({ error: e.message })
    }
  }
  return res.status(200).send()
})

export default router
