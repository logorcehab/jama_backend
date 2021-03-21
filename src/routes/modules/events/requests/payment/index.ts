import { Router, Request, Response } from 'express'
import paypal from 'paypal-rest-sdk'
import stripe from '../../../../../libs/modules/stripe'
import getAuthUserRequestStatus from '../../../../../libs/functions/events/get-auth-user-request-status'
import { Event } from '@florinrelea/sparc-shared/models'
import { User } from '@florinrelea/sparc-shared/models'
import { PaymentSession } from '@florinrelea/sparc-shared/models'

const Models = {
  Event,
  User,
  PaymentSession
}

async function paymentValidator(req: Request, res: Response) {
  const authId = res.locals.user
  const { eventId } = req.params
  const event = await Models.Event.findById(eventId)

  if (!event) {
    res.status(404).json({ error: 'Event not found' })
    return null
  }

  if (!event.price) {
    res.status(401).json({ error: 'This engagement does not require payment' })
    return null
  }

  if (Date.now() >= event.timestamp_end) {
    res.status(401).json({ error: 'This engagement has passed!' })
    return null
  }

  const host = await Models.User.findById(event.created_by)

  if (!host) {
    res.status(404).json({ error: 'Host not found' })
    return null
  }

  const user = await Models.User.findById(authId)

  if (!user) {
    res.status(404).json({ error: 'Host not found' })
    return null
  }

  const requestData = await getAuthUserRequestStatus(event, host, authId)

  if (!requestData.status.includes('pending_payment')) {
    res.status(401).json({ error: 'You did not register' })
    return null
  }

  const successUrl = `${global.SERVER_URL}/payment/success?username=${Buffer.from(user.first_name).toString('base64')}`
  const failureUrl = `${global.SERVER_URL}/payment/failed?username=${Buffer.from(user.first_name).toString('base64')}&retry=${Buffer.from(`/payment/${event._id}`).toString('base64')}`

  return {
    event, host, requestData, successUrl, failureUrl
  }
}

const router = Router()

router.post('/stripe/create-checkout-session/:eventId', async (req, res, next) => {
  const authId = res.locals.user
  let paymentData
  try {
    paymentData = await paymentValidator(req, res)
    if (paymentData === null) return false
  } catch (e) {
    return next(e)
  }

  const {
    event, host, requestData, successUrl, failureUrl
  } = paymentData

  try {
    const price = Number(event.price[requestData.request.type as 'virtual' | 'inperson'])

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: event.event_name,
              images: [
                event.event_image_lg || event.event_image,
                host.profile_image_lg || host.profile_image
              ]
            },
            unit_amount: price * 100
          },
          quantity: 1
        }
      ],
      mode: 'payment',
      success_url: successUrl,
      cancel_url: failureUrl
    })

    const { payment_intent } = session

    await new Models.PaymentSession({
      _id: payment_intent,
      user_id: authId,
      payment_scope: 'engagement participation',
      event_id: event._id,
      client_ip: req.ip || '',
      timestamp: Date.now(),
      payment_id: payment_intent
    }).save()

    return res.status(200).json({ session_id: session.id })
  } catch (e) {
    return next(e)
  }
})

router.post('/paypal/create-payment/:eventId', async (req, res, next) => {
  const authId = res.locals.user

  let paymentData
  try {
    paymentData = await paymentValidator(req, res)
  } catch (e) {
    return next(e)
  }

  if (paymentData === null) return false

  const {
    event, requestData, successUrl, failureUrl
  } = paymentData

  if (!requestData.request.type) return false

  const price = Number(event.price[requestData.request.type])

  const create_payment_json = {
    intent: 'sale',
    payer: {
      payment_method: 'paypal'
    },
    redirect_urls: {
      return_url: successUrl,
      cancel_url: failureUrl
    },
    transactions: [{
      item_list: {
        items: [{
          name: 'Engagement Participation',
          sku: 'item',
          price: String(price),
          currency: 'USD',
          quantity: 1
        }]
      },
      amount: {
        currency: 'USD',
        total: String(price)
      },
      description: event.event_name
    }]
  }

  paypal.payment.create(create_payment_json, async (error, payment) => {
    if (error) {
      return next(error.response || error)
    }

    // Store session
    await new Models.PaymentSession({
      _id: payment.id,
      user_id: authId,
      payment_scope: 'engagement participation',
      event_id: event._id,
      client_ip: req.ip || '',
      timestamp: Date.now(),
      payment_id: payment.id
    }).save()

    return res.status(200).json({ paymentId: payment.id })
  })
  return true
})

router.post('/paypal/execute-payment', async (req, res, next) => {
  let paymentId
  let payerId
  try {
    const { body } = req
    paymentId = body.paymentID
    payerId = { payer_id: body.payerID }
  } catch (e) {
    return next(e)
  }
  paypal.payment.execute(paymentId, payerId, (error, payment) => {
    if (error) {
      console.error(JSON.stringify(error))
      return res.status(500).json({ error: 'Could not execute the payment!' })
    }

    if (payment.state === 'approved') {
      return res.status(200).json({ success: true })
    }

    return res.status(400).json({ error: 'The payment failed!' })
  })
  return true
})

export default router
