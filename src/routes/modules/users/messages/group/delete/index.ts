import { Router } from 'express'
import { User, UserConnection } from '../../../../../../models'
import { generateMessageId } from '../../../../../../libs/modules/users/messages/utils'

const Models = {
  User,
  UserConnection
}

const router = Router()

router.delete('/member/:groupId/:userId', async (req, res, next) => {
  const { groupId, userId } = req.params
  const authId = req.user
  // Check is self removal
  if (userId === authId) {
    return res.status(400).json({ error: 'You cannot remove yourself!' })
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
  // Check if auth is admin
  const { users } = group
  let isAdmin = false
  if (users) {
    users.forEach(member => {
      const memberId = member._id
      if (member.admin === true && memberId === authId) {
        isAdmin = true
      }
    })
  }
  if (!isAdmin) {
    return res.status(401).json({ error: 'You have to be an admin in order to do that!' })
  }
  // Get auth and user
  let auth
  let user
  try {
    auth = await Models.User.findById(authId)
    user = await Models.User.findById(userId)
  } catch (e) {
    return next(e)
  }
  if (!auth) {
    return res.status(404).json({ error: 'Admin could not be found' })
  }
  if (!user) {
    return res.status(404).json({ error: 'User could not be found' })
  }
  // Start algorithm
  try {
    // Clear new messages
    if (user.jama_messages
      && user.jama_messages.new_messages
      && user.jama_messages.new_messages.find(el => el._id === groupId)
    ) {
      await Models.User.findByIdAndUpdate(userId, {
        $pull: {
          'jama_messages.new_messages': {
            _id: groupId
          }
        }
      })
    }
    // Remove user from connection users
    await Models.UserConnection.findByIdAndUpdate(groupId, {
      $pull: {
        users: {
          _id: userId
        }
      }
    })
    // Remove connection from user
    await Models.User.findByIdAndUpdate(userId, {
      $pull: {
        'jama_messages.connections': {
          _id: groupId
        }
      }
    })
    // Send system message
    const systemMessage:{
      _id: string
      from: string
      message: string
      timestamp: number
      attachments: string[]
    } = {
      _id: await generateMessageId(groupId),
      from: 'system',
      message: `${auth.first_name} ${auth.last_name[0].toUpperCase()}. removed ${user.first_name} ${user.last_name[0].toUpperCase()}. from this group`,
      timestamp: Date.now(),
      attachments: []
    }
    await Models.UserConnection.findByIdAndUpdate(groupId, {
      $push: {
        messages: systemMessage
      }
    })
  } catch (e) {
    return next(e)
  }
  return res.status(200).send()
})

export default router
