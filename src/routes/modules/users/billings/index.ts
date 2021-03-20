import { Router } from 'express'
import convertHTMLToPDF from 'html-pdf'
import renderHtml from '../../../../libs/modules/html-renderer'
import { User, UserBillings } from '../../../../models'
import { Event } from '../../../../models'

const Models = {
  UserBillings,
  Event,
  User
}

const router = Router()

router.get('/get', async (req, res, next) => {
  const authId = req.user
  let bills
  /*
    id: paymentId,
    amount: paidAmount,
    timestamp: paymentDate,
    payment_service: paymentService,
    client_ip: paymentSession.client_ip,
    participation_type: userParticipationRequest.request.type,
    event_id: paymentSession.event_id,
    payment_scope
  */
  try {
    const billingsData = await Models.UserBillings.findById(authId)
    if (billingsData) {
      bills = billingsData.billings
    }
  } catch (e) {
    return next(e)
  }

  if (!bills) {
    return res.status(200).json({ bills: [] })
  }

  const formatted = []
  for (const bill of bills) {
    const required: (keyof typeof bill)[] = ['_id', 'amount', 'payment_service', 'payment_scope', 'event_id']
    const formattedBill: {
      [key: string]: any
    } = {}
    for (const item of required) {
      if (Object.prototype.hasOwnProperty.call(bill, item)) {
        formattedBill[item] = bill[item]
      }
    }

    // Get date
    formattedBill.date = new Date(bill.timestamp).toLocaleDateString()

    // If event
    if (formattedBill.event_id) {
      try {
        const { event_id: eventId } = formattedBill
        const event = await Models.Event.findById(eventId)
        if (!event) {
          throw new Error(`Event with id ${eventId} not found!`)
        }
        formattedBill.event_name = event.event_name.length > 30 ? `${event.event_name.slice(0, 30)}...` : event.event_name
      } catch (e) {
        console.error(e)
        continue
      }
    }
    formatted.push(formattedBill)
  }

  return res.status(200).json({ bills: formatted })
})

router.get('/export-pdf/Jama-Billings.pdf', async (req, res, next) => {
  const authId = req.user
  let user
  try {
    user = await Models.User.findById(authId)
    if (!user) {
      console.log(user)
      throw new Error(`User with id ${authId} not found!`)
    }
  } catch (e) {
    return next(e)
  }

  let bills
  try {
    const billingsData = await Models.UserBillings.findById(authId)
    if (billingsData) {
      bills = billingsData.billings
    }
  } catch (e) {
    return next(e)
  }

  if (!bills) {
    return res.status(404).send('<h1>No bill found</h1>')
  }

  const billsRows = []
  for (const bill of bills) {
    // Get additional data
    let eventName = ' - '
    if (bill.event_id) {
      try {
        const event = await Models.Event.findById(bill.event_id, 'event_name')
        if (event) {
          eventName = event.event_name.length > 30 ? `${event.event_name.slice(0, 30)}...` : event.event_name
        }
      } catch (e) {
        console.error(e)
      }
    }
    /*
    <th>Id</td>
    <th>Payment Service</th>
    <th>Payment Scope</th>
    <th>Date</th>
    <th>Name</th>
    <th class="text-right">Amount</th>
    */
    const row = [
      bill._id,
      bill.payment_service,
      bill.payment_scope,
      new Date(bill.timestamp).toLocaleDateString(),
      eventName,
      bill.amount
    ]

    billsRows.push(row)
  }

  const totalPaid = bills.map(record => record.amount)
    .reduce((a, b) => Number(a) + Number(b)).toFixed(2)

  const htmlData = {
    user: {
      fullName: `${user.first_name} ${user.last_name}`,
      email: user.email,
      phone: user.phone || ' - '
    },
    billsRows,
    total: totalPaid
  }

  try {
    const html = await renderHtml({ filePath: './routes/modules/users/billings/components/billings.html', data: htmlData })
    convertHTMLToPDF.create(html, { format: 'A4' }).toStream((err, stream) => {
      if (err) { throw new Error('Could not covert to pdf') }
      res.setHeader('Content-Type', 'application/pdf')
      res.setHeader('Content-Disposition', 'inline;filename=Sparc-Billings.pdf')
      stream.pipe(res)
    })
  } catch (e) {
    return next(e)
  }

  return true
})

export default router
