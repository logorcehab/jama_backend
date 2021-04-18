import { Router } from 'express'
import AWS from 'aws-sdk'
import pdf from 'pdf-parse'
import getAllRegistrants from '../../../../../../libs/functions/get-all-registrants-ids-and-types-from-event'
import { getBufferFromUrl, getTextFromUrlDocument } from './utils'
import { event as eventGlobals } from '../../../../../../globals/importable/variables'
import { Event, EventAttendance } from '@florinrelea/sparc-shared/models'
import { User } from '@florinrelea/sparc-shared/models'

const Models = {
  Event,
  EventAttendance,
  User
}

const cloudStorage = new AWS.S3({
  accessKeyId: process.env.AWSAccessKeyId,
  secretAccessKey: process.env.AWSSecretKey,
  params: {
    Bucket: 'cdn.sparc.world'
  }
})

const router = Router()

router.get('/:eventId/search-keywords-in-requisite-files/:keywords', async (req, res, next) => {
  const uid = res.locals.user
  const { eventId } = req.params
  let keywords = []
  let filter
  try {
    keywords = JSON.parse(req.params.keywords)
    if (!Array.isArray(keywords)) {
      return res.status(400).json({ error: 'Wrong keywords format' })
    }
  } catch (e) {
    return next(e)
  }

  // Remove spaces at the beginning or end
  keywords = keywords.map(item => item.trim())

  if (req.query && req.query.filterUsers) {
    filter = req.query.filter
  }

  if ((keywords.length < 1) || (keywords.length > 10)) {
    return res.status(400).json({ error: `Expected min 1 keyword - max 10 keywords, got ${keywords.length}` })
  }
  const event = await Models.Event.findById(eventId)

  if (!event) {
    return res.status(404).json({ error: 'Event not found' })
  }

  if (event.created_by !== uid) {
    return res.status(401).json({ error: 'User is not the host' })
  }
  const { registrants_files } = event

  if (!registrants_files) {
    return res.status(200).json({ result: [] })
  }

  function findRequestIdFromUserId(userId: string): string {
    if (!event) return ''
    const registrationLabels = eventGlobals.REGISTRATION_LABELS
    for (const label of registrationLabels) {
      if (event[label]) {
        for (const requestId of Object.keys(event[label])) {
          if (event[label][requestId] === userId) {
            return requestId
          }
        }
      }
    }

    return ''
  }

  let registrantsObjects = getAllRegistrants(event)

  if (filter === 'confirmed-attendance') {
    const attendanceDocument = await Models.EventAttendance.findById(eventId, 'confirmed') || { confirmed: [] }

    const confirmedUsersIds: string[] = attendanceDocument.confirmed

    registrantsObjects = registrantsObjects.filter(el => confirmedUsersIds.includes(el._id))
  }

  const results = []

  for (const registrantObject of registrantsObjects) {
    const userId = registrantObject._id
    let user
    try {
      const rawUser = await Models.User.findById(userId)
      if (!rawUser) continue
      user = {
        ...rawUser,
        registration_type: registrantObject.type
      }
    } catch (e) {
      continue
    }
    const finalObject = {
      id: user._id,
      first_name: user.first_name,
      last_name: user.last_name,
      profile_image: user.profile_image,
      text: '',
      occurrences: 0
    }

    const registrationRequestId = findRequestIdFromUserId(user._id)

    const requisitePath = decodeURIComponent(registrants_files[registrationRequestId].replace('https://s3.amazonaws.com/cdn.sparc.world/', '').split('+').join(' '))
    const url = await cloudStorage.getSignedUrl('getObject', {
      Key: requisitePath,
      Expires: 20
    })
    const fileName = requisitePath.split('/')[requisitePath.split('/').length - 1]
    let content = ''
    if (url.toLowerCase().includes('.pdf')) {
      try {
        const dataBuffer = await getBufferFromUrl(url)
        content = (await pdf(dataBuffer)).text
      } catch (e) {
        console.error(e)
      }
    } else {
      try {
        content = await getTextFromUrlDocument(url, fileName)
        console.log('Dev note: "Warning TT: undefined function: 32" =>  bad font recovery message')
      } catch (e) {
        console.error(e)
      }
    }

    if (content) {
      const targeText = String(content).toLowerCase()
      finalObject.text = targeText

      for (const keyword of keywords) {
        finalObject.text = finalObject.text.replace(new RegExp(keyword, 'g'), `<mark>${keyword}</mark>`)
        finalObject.occurrences += (finalObject.text.match(new RegExp(keyword, 'g')) || []).length
      }
    }
    results.push(finalObject)
  }

  return res.status(200).json({ results })
})

export default router
