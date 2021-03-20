import { Router } from 'express'
import { User } from '../../../../../models'

const Models = {
  User
}

const router = Router()

router.patch('/blockfromid/:id/:state', async (req, res, next) => {
  const targetId = req.params.id
  let state = false
  if (req.params.state === 'true') {
    state = true
  }
  const authId = req.user
  let auth
  let target
  // Validation
  try {
    auth = await Models.User.findById(authId)
  } catch (e) {
    return next(e)
  }
  if (!auth) {
    return res.status(404).json({ error: 'Auth user not found!' })
  }
  try {
    target = await Models.User.findById(targetId)
  } catch (e) {
    return next(e)
  }
  if (!target) {
    return res.status(404).json({ error: 'User not found!' })
  }
  try {
    if (state === true) {
      await Models.User.findByIdAndUpdate(target._id, {
        $push: {
          blocked_by: auth._id
        }
      })
      await Models.User.findByIdAndUpdate(auth._id, {
        $push: {
          block_messages_from_users: target._id
        }
      })
    } else {
      await Models.User.findByIdAndUpdate(target._id, {
        $pull: {
          blocked_by: auth._id
        }
      })
      await Models.User.findByIdAndUpdate(auth._id, {
        $pull: {
          block_messages_from_users: target._id
        }
      })
    }

    return res.status(200).send()
  } catch (e) {
    return next(e)
  }
})
router.patch('/smsnotifications/:state', async (req, res, next) => {
  let state = false
  if (req.params.state === 'true') {
    state = true
  }
  const authId = req.user
  let auth
  try {
    auth = await Models.User.findById(authId)
  } catch (e) {
    return next(e)
  }
  if (!auth) {
    return res.status(404).json({ error: 'Auth user not found!' })
  }
  try {
    await Models.User.findByIdAndUpdate(auth._id, {
      sms_notifications: state
    })

    return res.status(200).send()
  } catch (e) {
    return next(e)
  }
})
router.patch('/emailnotifications/:state', async (req, res, next) => {
  let state = false
  if (req.params.state === 'true') {
    state = true
  }
  const authId = req.user
    let auth
  try {
    auth = await Models.User.findById(authId)
  } catch (e) {
    return next(e)
  }
  if (!auth) {
    return res.status(404).json({ error: 'Auth user not found!' })
  }
  try {
    await Models.User.findByIdAndUpdate(auth._id, {
      email_notifications: state
    })

    return res.status(200).send()
  } catch (e) {
    return next(e)
  }
})

export default router
