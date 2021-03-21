import { Router } from 'express'
import uploader, { UploadedFile } from 'express-fileupload'
import crypto from 'crypto'
import uploadToCloud from '../../../../../../libs/modules/storage/upload'
import validation from '../../../../../../libs/modules/validation/index.js'
import getAuthUserRequestStatus from '../../../../../../libs/functions/events/get-auth-user-request-status'
import { scheduleNotification } from '@florinrelea/sparc-shared/libs/modules/worker'
import generateRequestId from '../../../../../../libs/functions/events/generate-event-request-id'
import validateFormSurveyResponse from '../../../../../../libs/functions/events/survey/validate-form-survey-response'
import { Event, User } from '@florinrelea/sparc-shared/models'

const Models = {
  Event,
  User
}

const router = Router()

router.post('/participate', uploader(), async (req, res, next) => {
  const b = req.body
  const authId = res.locals.user
  if (!b.id || !b.type) {
    return res.status(400).json({ error: 'Wrong payload' })
  }
  const target = b.id
  const request = {
    type: b.type,
    form: b.form,
    acceptedFormRequisite: b.acceptedFormRequisite
  }
  if (request.type !== 'virtual') {
    request.type = 'in Person'
  }
  let eventDebugger
  try {
    eventDebugger = await Models.Event.findById(target)
  } catch (e) {
    return next(e)
  }

  if (!eventDebugger) {
    return res.status(404).json({ error: 'This event does not exist!' })
  }

  const event = eventDebugger

  // Check if host
  if (event.created_by === authId) {
    return res.status(401).json({ error: 'You are the host!' })
  }

  if (
    (event.event_type !== 'both')
    && (event.event_type !== request.type)
  ) {
    return res.status(400).json({ error: 'Invalid participation type!' })
  }

  // Check if already signed
  let isSigned = false

  async function checkIfSigned() {
    const host = await Models.User.findById(event.created_by)

    if (!host) {
      throw new Error('Host not found')
    }

    const requestStatus = await getAuthUserRequestStatus(event, host, authId)

    return requestStatus.status !== null
  }

  try {
    isSigned = await checkIfSigned()
  } catch (e) {
    return next(e)
  }

  if (isSigned) {
    return res.status(401).json({ error: 'You are already signed!' })
  }
  // Sign validation ~ Finish

  // Check if spots left
  let isFullEvent = false
  if (request.type === 'virtual') {
    const capacity = event.capacity.virtual as number
    let participants = event.virtual_attending ? Object.keys(event.virtual_attending).length : 0
    if (event.pending_virtual) {
      participants += Object.keys(event.pending_virtual).length
    }
    if (event.pending_payment_virtual) {
      participants += Object.keys(event.pending_payment_virtual).length
    }

    if (participants >= capacity) {
      isFullEvent = true
    }
  } else {
    const capacity = event.capacity.inperson as number
    let participants = event.users_attending ? Object.keys(event.users_attending).length : 0
    if (event.pending_inperson) {
      participants += Object.keys(event.pending_inperson).length
    }
    if (event.pending_payment_inperson) {
      participants += Object.keys(event.pending_payment_inperson).length
    }

    if (participants >= capacity) {
      isFullEvent = true
    }
  }

  if (isFullEvent) {
    return res.status(401).json({ error: 'This event is full!' })
  }

  let storeRequisiteFile = false
  let storeRequisiteForm = false

  // Validation requisite
  if (event.registration_requisite === true) {
    // Validate file requisite
    if (event.registration_file) {
      // If file is required
      if (event.registration_file.required === true) {
        if (!req.files || !req.files.file) {
          return res.status(400).json({ error: 'Requires file' })
        }
      }
      if (req.files && req.files.file) {
        const isValidFile = validation.file({ file: req.files.file, maxSize: 5000000 })
        if (isValidFile !== true) {
          return res.status(400).json({ error: isValidFile })
        }
        storeRequisiteFile = true
      }
    }
    if (event.registration_form) {
      // Validate form requisite
      const { form } = request
      if (
        event.registration_form.required === true
        || (event.registration_form.required === false && request.acceptedFormRequisite === true)
      ) {
        if (!form) {
          return res.status(400).json({ error: 'Expected requisite data!' })
        }
      }

      if (form) {
        try {
          validateFormSurveyResponse(event.registration_form.packed_form, form)
        } catch (e) {
          return res.status(400).json({ error: e.message })
        }

        storeRequisiteForm = true
      }
    }
  }

  // Check if requires confirmation
  let requestCategory = null
  if (event.requires_confirmation === true) {
    requestCategory = request.type === 'virtual' ? 'pending_virtual' : 'pending_inperson'
  } else {
    requestCategory = request.type === 'virtual' ? 'virtual_attending' : 'users_attending'
  }

  // Check if requires payment
  if (event.price) {
    requestCategory = request.type === 'virtual' ? 'pending_payment_virtual' : 'pending_payment_inperson'
  }

  let requestId = null
  try {
    requestId = await generateRequestId(event._id)
  } catch (e) {
    return next(e)
  }

  // Store requisites

  // Already validated above
  if (event.registration_requisite === true) {
    if (storeRequisiteFile && req.files) {
      const safeFolder = crypto.randomBytes(24).toString('hex')
      try {
        const fileUrl = await uploadToCloud(req.files.file as UploadedFile, `default:event_requisites/${event._id}/${authId}/${safeFolder}`)
        await Models.Event.findByIdAndUpdate(event._id, {
          $set: {
            [`registrants_files.${requestId}`]: fileUrl
          }
        })
      } catch (e) {
        return console.error(e)
      }
    }
    if (storeRequisiteForm) {
      const userResponses = JSON.parse(request.form)
      try {
        await Models.Event.findByIdAndUpdate(event._id, {
          [`registrants_forms.${requestId}`]: userResponses
        })
      } catch (e) {
        return next(e)
      }
    }
  }

  try {
    await Models.Event.findByIdAndUpdate(target, {
      $set: {
        [`${requestCategory}.${requestId}`]: authId
      }
    })
  } catch (e) {
    return next(e)
  }

  // Set data to guest if attending
  if (requestCategory.includes('attending')) {
    try {
      await Models.User.findByIdAndUpdate(authId, {
        $inc: {
          number_of_attended_events: 1
        },
        $push: {
          attended_events: event._id
        },
        last_event_attended: event._id
      })
    } catch (e) {
      return next(e)
    }
  }

  const timestamp = Date.now()
  try {
    await Models.Event.findByIdAndUpdate(event._id, {
      $set: {
        [`register_timestamps.${requestId}`]: timestamp
      }
    })
  } catch (e) {
    return next(e)
  }

  if (requestCategory.includes('pending') && !requestCategory.includes('payment')) {
    const t = {
      event: event._id,
      request: requestId
    }
    // Host notification
    if (event.notifications !== false) {
      try {
        await scheduleNotification.events.host.pendingRequest(t)
      } catch (e) {
        console.error(e)
      }
    }

    // Guest notification
    try {
      await scheduleNotification.events.guest.pendingRequestConfirmation(t)
    } catch (e) {
      console.error(e)
    }
  } else if (requestCategory.includes('attending')) {
    // Attending notification

    // Host notification
    if (event.notifications !== false) {
      const t = {
        event: event._id,
        request: requestId
      }
      try {
        await scheduleNotification.events.host.newRegistrant(t)
      } catch (e) {
        console.error(e)
      }
    }

    // Guest notification
    const o = {
      event: event._id,
      request: requestId
    }
    try {
      await scheduleNotification.events.guest.acceptedRequest(o)
    } catch (e) {
      console.error(e)
    }
  }

  return res.status(200).json({ requestId })
})

export default router
