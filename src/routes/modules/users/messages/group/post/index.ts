import { Router } from 'express'
import uploader, { UploadedFile } from 'express-fileupload'
import crypto from 'crypto'
import { User, UserConnection } from '../../../../../../models'
import uploadToCloud from '../../../../../../libs/modules/storage/upload'
import validate from '../../../../../../libs/modules/validation'
import { createGroup as createMessagesGroup } from '../../../../../../libs/modules/users/messages'
import generateConnectionId from '../../../../../../libs/modules/users/messages/generate-connection-id'
// Models

const Models = {
  User,
  UserConnection
}

const router = Router()

router.post('/add-users', async (req, res, next) => {
  const authId = req.user
  const b = req.body
  if (!b || !b.users || !b.groupId) {
    return res.status(400).json({ error: `Expected array of users, got ${b.users}` })
  }
  const { groupId } = b
  let users: string[] = []
  try {
    users = JSON.parse(b.users)
  } catch (e) {
    return next(e)
  }
  if (users.length === 0) {
    return res.status(400).json({ error: 'Expected at least 1 user.' })
  }
  // Check if group exists
  let group
  try {
    group = await Models.UserConnection.findById(groupId)
  } catch (e) {
    return next(e)
  }
  if (!group) {
    return res.status(404).json({ error: 'Group not found!' })
  }
  // Check is auth is admin
  const groupUsers = group.users
  let isAdmin = false
  if (groupUsers) {
    for (const memberId of Object.keys(groupUsers)) {
      const object = groupUsers.find(el => el._id === memberId)
      if (object && object.admin === true && memberId === authId) {
        isAdmin = true
      }
    }
  }
  if (!isAdmin) {
    return res.status(401).json({ error: 'You have to be an admin in order to do add users!' })
  }
  // Check is users from list are already members
  for (const userId of groupUsers) {
    for (let index of users) {
      const id = index
      if (userId._id === id) {
        index = null
      }
    }
  }
  users = users.filter(id => id != null)
  // Validate each user
  for (const index of users) {
    const userId = index
    let user
    try {
      user = await Models.User.findById(userId)
    } catch (e) {
      return next(e)
    }
    // Check if profile private
    if (
      !user
      || (user.control_panel
        && user.control_panel.profile_private === true
      )
    ) {
      return res.status(404).json({ error: 'An user from your list does not exist!' })
    }
    // Check if disabled messages
    if (user.control_panel && user.control_panel.disabled_messages === true) {
      return res.status(404).json({ error: `${user.first_name} disabled messages!` })
    }
  }
  // Start
  let auth
  try {
    auth = await Models.User.findById(authId)
  } catch (e) {
    return next(e)
  }

  if (!auth) {
    return res.status(404).json({ error: 'Auth user not found' })
  }

  for (const i of users) {
    const userId = i
    let user
    let defaultMessage = {}
    let success = false
    try {
      user = await Models.User.findById(userId)
      if (!user) continue
      // System message
      defaultMessage = {
        from: 'system',
        message: `${auth.first_name} ${auth.last_name[0].toUpperCase()}. added ${user.first_name} ${user.last_name[0].toUpperCase()}. to this group`,
        timestamp: Date.now()
      }
      // Add users to connection
      await Models.UserConnection.findByIdAndUpdate(groupId, {
        $push: {
          users: {
            _id: userId,
            admin: false
          }
        }
      })
      // Set connection for every participant
      await Models.User.findByIdAndUpdate(userId, {
        $push: {
          'jama_messages.connections': {
            _id: groupId,
            last_message: defaultMessage,
            type: 'group'
          }
        }
      })
      success = true
    } catch (e) {
      console.error(e)
    }

    if (success) {
      await Models.User.findByIdAndUpdate(groupId, {
        $push: {
          messages: defaultMessage
        }
      })
      // Queue notification

    }
  }
  return res.status(200).send()
})
router.post('/create', uploader(), async (req, res, next) => {
  const authId = req.user
  let auth
  // Validation
  try {
    auth = await Models.User.findById(authId)
  } catch (e) {
    return next(e)
  }
  if (!auth) {
    return res.status(404).json({ error: 'Auth user not found!' })
  }
  if (
    !req.body
    || !req.body.name
    || (req.body.name.length < 3)
    || !req.body.participants
  ) {
    return res.status(400).json({ error: 'Wrong payload!' })
  }
  try {
    const checker = !JSON.parse(req.body.participants)
    if (checker) {
      return res.status(400).json({ error: 'Wrong payload!' })
    }
  } catch (e) {
    return res.status(400).json({ error: 'Wrong payload!' })
  }
  const payload: {
    name: string
    image: string
    participants: string[]
  } = {
    name: req.body.name,
    image: `${'cdn_link'}/assets/images/avatars/group.png`, // Insert CDN Link here
    participants: []
  }

  try {
    payload.participants = JSON.parse(req.body.participants)
  } catch (e) {
    return next(e)
  }

  const participants: {
    [key: string]: any
  } = {}
  // Validate participants
  for (const id of payload.participants) {
    let u
    try {
      u = await Models.User.findById(id)
    } catch (e) {
      return next(e)
    }
    if (!u) {
      return res.status(400).json({ error: 'A users from your list does not exist!' })
    }
    if (u.control_panel && u.control_panel.disabled_messages) {
      return res.status(400).json({ error: `It looks like ${u.first_name} ${u.last_name} disabled the messages` })
    }
    participants[id] = u
  }
  let groupId = null
  try {
    groupId = await generateConnectionId()
  } catch (e) {
    return next(e)
  }
  if (req.files && req.files.image) {
    // Validate file
    const imageFile = req.files.image as UploadedFile
    const checker = validate.file({ file: req.files.image, type: 'image', maxSize: 10000000 })
    if (!checker) {
      return res.status(400).json({ error: checker })
    }
    const safeName = crypto.randomBytes(24).toString('hex')
    imageFile.name = `${safeName}.png`
    try {
      payload.image = await uploadToCloud(imageFile, `default:group_images/${groupId}`)
    } catch (e) {
      return next(e)
    }
  }
  console.log(payload.participants)
  try {
    await createMessagesGroup(groupId, payload.name, auth._id, payload.image, payload.participants)
  } catch (e) {
    return next(e)
  }
  return res.status(200).json(payload)
})

export default router
