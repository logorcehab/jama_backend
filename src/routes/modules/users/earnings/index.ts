import { Router } from 'express'
import convertHTMLToPDF from 'html-pdf'
import moment from 'moment'
import renderHtml from '../../../../libs/modules/html-renderer'
import { UserEarnings } from '../../../../models'

const Models = {
  UserEarnings
}

const router = Router()

router.get('/get', async (req, res, next) => {
  const authId = req.user
  let rawEarnings = []
  try {
    const earningsDocument = await Models.UserEarnings.findById(authId, 'earnings')
    rawEarnings = earningsDocument?.earnings || []
  } catch (e) {
    return next(e)
  }

  const earnings = []
  for (const index of rawEarnings) {
    const rawRecord = index
    const record = {
      amount: rawRecord.amount,
      _id: rawRecord._id,
      date: new Date(rawRecord.timestamp).toLocaleDateString(),
      type: rawRecord.type,
      name: rawRecord.name
    }

    earnings.push(record)
  }

  return res.status(200).json({ earnings })
})
router.get('/export-pdf/Jama-Earnings.pdf', async (req, res, next) => {
  const authId = req.user

  const earnings = []
  try {
    const earningsDocument = await Models.UserEarnings.findById(authId, 'earnings')

    const rawEarnings = earningsDocument?.earnings || []

      for (const index of rawEarnings) {
      const rawRecord = index
      const record = {
        amount: rawRecord.amount,
        _id: rawRecord._id,
        date: moment(rawRecord.timestamp).format('MM-DD-YYYY'),
        type: rawRecord.type,
        name: rawRecord.name
      }

      earnings.push(record)
    }
  } catch (e) {
    return next(e)
  }

  const totalEarned = earnings
    .map(record => record.amount)
    .reduce((a, b) => a + b, 0)
  const jamaTotalTax = Number(Number(totalEarned * (0.02)).toFixed(2))
  // '2.9% + $0.30'
  const paymentServiceTotal = Number(
    Number(totalEarned * (2.9 / 200) + 0.3).toFixed(2)
  )

  const bodyRows = []
  for (const record of earnings) {
    bodyRows.push(Object.values(record))
  }

  const rendererData = {
    head: ['Amount ($)', 'Id', 'Date', 'Type', 'Name'],
    bodyRows,
    jamaTaxPercentage: 0.02,
    jamaTotalTax: Number(jamaTotalTax).toLocaleString('en'),
    paymentServiceTax: '2.9% + $0.30',
    paymentServiceTotal: Number(paymentServiceTotal).toLocaleString('en'),
    total: Number(totalEarned).toLocaleString('en'),
    finalEarnings: Number((totalEarned - jamaTotalTax - paymentServiceTotal)
      .toFixed(2)).toLocaleString('en'),
    issuedAt: moment().format('MM-DD-YYYY')
  }

  let html
  try {
    html = renderHtml({ filePath: './routes/modules/users/earnings/components/template.html', data: rendererData })
  } catch (e) {
    return next(e)
  }

  convertHTMLToPDF.create(html, { format: 'A4' }).toStream((err, stream) => {
    if (err) {
      res.status(500).json({ error: 'Internal server error!' })
      return
    }
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', 'inline;filename=Jama-Earnings.pdf')
    stream.pipe(res)
  })
  return true
})

export default router
