import { Router } from 'express'
import deleteStorageItem from '../../../../../libs/modules/storage/delete'
import { User } from '../../../../../models'

const Models = {
  User
}

const router = Router()

router.delete('/profile-image', async (req, res, next) => {
  const authId = req.user
  let oldImage = null
  try {
    const userDocument = await Models.User.findById(authId, 'profile_image') || { profile_image: '' }
    oldImage = userDocument.profile_image
    await Models.User.findByIdAndUpdate(authId, {
      $unset: {
        profile_image: 1
      }
    })
  } catch (e) {
    return next(e)
  }

  if (oldImage) {
    try {
      await deleteStorageItem(oldImage)
    } catch (e) {
      console.error(e)
    }
  }
  return res.status(200).send()
})


router.delete('/event-highlight/id', async (req, res, next) => {
  const authId = req.user
  if (!req.body || !req.body.event_highlight) {
    return res.status(400).json({ error: 'wrong query' })
  }
  const eventHighlightId = req.body.event_highlight
  const user = await Models.User.findOne({
    _id: authId,
    event_highlight: {
      _id: eventHighlightId
    }
  })
  if(!user){
    return res.status(400).json({ error: 'highlight does not exist' })
  }
  try {
    await deleteStorageItem(eventHighlightId)
     await Models.User.findOneAndUpdate(user._id, {
      $pull: {
        event_highlight: {
          _id: eventHighlightId
        }
      }
    })
  } catch (e) {
    return next(e)
  }
  return res.status(200).send()
})

export default router
