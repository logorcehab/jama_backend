import { Router } from 'express'
import {
  User, UserAnalytics, Event, Tag
} from '../../../../models'
import { IUser } from '../../../../models/user/User'
import generatePublicUser from '../../../../libs/functions/users/generate-public-user'
// Routes
import followersRoute from './followers'
import followingRoute from './following'
// Models

const Models = {
  User,
  UserAnalytics,
  Tag,
  Event
}

const router = Router()

router.use('/followers', followersRoute)
router.use('/following', followingRoute)

router.get('/me/additional-info', async (req, res, next) => {
  const authId = req.user
  let additionalInfo
  try {
    const userDocument = await Models.User.findById(authId, '_id additional_info')
    additionalInfo = userDocument?.additional_info
  } catch (e) {
    return next(e)
  }
  return res.status(200).json({ additionalInfo })
})
router.get('/me/all', async (req, res, next) => {

  const uid = req.user
  let rawUser
  try {
    rawUser = await Models.User.findById(uid)
  } catch (e) {
    return next(e)
  }
  if (!rawUser) {
    return res.status(400).json({ error: 'user not found' })
  }

  const user: IUser & {
    password?: any
    confirmed_accounts?: any
    additional_info?: any
    interest_tags: any
    created_at?: number
    pending_requests?: boolean
  } = rawUser

  // Collect data !!!!!!!!!!!!!!

  // Fetch interest_tags
  const interestTags = []
  try {
    for (const tagId of user.interest_tags) {
      const tag = await Models.Tag.findById(tagId)
      if (!tag) continue

      interestTags.push({ _id: tagId, value: tag.value })
    }
  } catch (e) {
    return next(e)
  }

  // Get creation timestamp
  const createdAt = user.creation?.timestamp

  if (createdAt) {
    user.created_at = createdAt
  }
  user.interest_tags = interestTags
  delete user.password
  delete user.confirmed_accounts
  delete user.additional_info
  return res.status(200).json(user)
})
router.get('/basic/id/:id', async (req, res, next) => {
  const target = req.params.id
  try {
    const user = await Models.User.findById(target)
    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }
    const fetched = {
      _id: target,
      first_name: user.first_name,
      last_name: user.last_name,
      profile_image: user.profile_image,
    }
    return res.status(200).json(fetched)
  } catch (e) {
    return next(e)
  }
})
router.get('/q/:id', async (req, res, next) => {
  const authId = req.user
  const stringQuery = req.params.id
  let auth
  let user

  try {
    auth = await Models.User.findById(authId)
  } catch (e) {
    return next(e)
  }
  if (!auth) {
    return res.status(404).json({ error: 'Auth user not found!' })
  }
  try {
    user = await generatePublicUser(stringQuery, auth._id)
  } catch (e) {
    if (e.message === '404') {
      return res.status(404).json({ error: 'User not found!' })
    }
    return next(e)
  }
  return res.status(200).json(user)
})

export default router
