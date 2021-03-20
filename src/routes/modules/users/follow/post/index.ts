import { Router } from 'express'
import { User, Event } from '../../../../../models'

const Models = {
  User,
  Event
}

const router = Router()

router.post('/unfollow/id', async (req, res, next) => {
  if (!req.body || !req.body.id) {
    return res.status(400).json({ error: 'wrong body' })
  }
  const target = req.body.id
  const authId = req.user
  let auth
  try {
    auth = await Models.User.findById(authId)

    if (!auth || !auth.following) {
      return res.status(404).json({ error: 'You are not following this user' })
    }

    // Delete from user
    await Models.User.findByIdAndUpdate(authId, {
      $pull: {
        following: target
      },
      $inc: {
        number_of_followed: -1
      }
    })

    // Delete from followed
    await Models.User.findByIdAndUpdate(target, {
      $pull: {
        followed_by: auth._id
      },
      $inc: {
        number_of_followers: -1
      }
    })

    return res.status(200).send()
  } catch (e) {
    return next(e)
  }
})
router.post('/follow/id/', async (req, res, next) => {
  if (!req.body || !req.body.id) {
    return res.status(400).json({ error: 'wrong body' })
  }
  const target = req.body.id
  const authId = req.user
  let auth
  try {
    auth = await Models.User.findById(authId)

    // Check if following
    const following = auth?.following || []

    if (following.includes(target)) {
      return res.status(409).json({ error: 'Already following' })
    }

    // Set to auth
    await Models.User.findByIdAndUpdate(authId, {
      $push: {
        following: target
      },
      $inc: {
        number_of_followed: 1
      }
    })

    // Set to follwed user
    await Models.User.findByIdAndUpdate(target, {
      $push: {
        followed_by: auth._id
      },
      $inc: {
        number_of_followers: 1
      }
    })

    return res.status(200).send()
  } catch (e) {
    return next(e)
  }
})

export default router
