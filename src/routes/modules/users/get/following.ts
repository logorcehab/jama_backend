import { Router } from 'express'
import { User } from '../../../../models'
import { IUser } from '../../../../models/user/User'

const Models = {
  User
}

const router = Router()

router.get('/:userId', async (req, res, next) => {
  const authId = req.user
  const target = req.params.userId
  let userId
  if (target === 'me') {
    userId = authId
  } else {
    userId = target
  }

  const following = []
  let user

  try {
    user = await Models.User.findById(userId)
  } catch (e) {
    return next(e)
  }

  if (!user) {
    return res.status(404).json({ error: 'User not found!' })
  }

  if (!user.following) {
    return res.status(200).json({ results: [] })
  }

  if (userId !== authId && (user.control_panel || {}).show_followed === false) {
    return res.status(401).json({ error: 'This user has disabled the followed users exposure!' })
  }

  const followingIds = user.following
  const requiredProps: (keyof IUser)[] = [
    '_id', 'profile_image', 'first_name', 'last_name', 'current_city', 'headline', 'control_panel'
  ]

  for (const followedId of followingIds) {
    try {
      const followedUser = await Models.User.findById(followedId)
      if (!followedUser) continue
      const collector: {
        [key: string]: any
      } = {}
      for (const prop of requiredProps) {
        if (Object.hasOwnProperty.call(followedUser, prop)) {
          collector[prop] = followedUser[prop]
        }
      }
      following.push(collector)
    } catch (e) {
      console.error(e)
    }
  }
  return res.status(200).json({ results: following })
})

export default router
