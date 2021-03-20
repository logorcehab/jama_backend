import { Router } from 'express'
import uploader, { UploadedFile } from 'express-fileupload'
import { User, UserConnection } from '../../../../../models'
import { sendMessageFromIdToId } from '../../../../../libs/modules/users/messages'


const Models = {
  User,
  UserConnection
}

const router = Router()

router.post('/send-message-to-user', uploader({ limits: { files: 5 } }), async (req, res, next) => {
  if (!req.body.id || !req.body.text) {
    return res.status(400).json({ error: 'Wrong payload' })
  }
  const target: {
    id: string
    text: string
    attachments: UploadedFile[]
  } = {
    id: req.body.id,
    text: req.body.text,
    attachments: []
  }
  if (req.files) {
    if (!Array.isArray(req.files.attachments)) {
      target.attachments = [req.files.attachments]
    } else {
      target.attachments = req.files.attachments.slice(0, 5)
    }
  }
  const authId = req.user
  let userObject
  try {
    userObject = await Models.User.findById(authId)
  } catch (e) {
    return next(e)
  }

  if (!userObject) {
    throw new Error(`User with id:${userObject} does not exist`)
  }
  try {
    await sendMessageFromIdToId(userObject._id, target.id, target.text, target.attachments)
  } catch (e) {
    return next(e)
  }

  return res.status(200).send()
})


export default router
