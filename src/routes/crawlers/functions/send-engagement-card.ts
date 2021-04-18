import htmlToImage from 'node-html-to-image'
import fs from 'fs'
import crypto from 'crypto'
import { Request, Response, NextFunction } from 'express'

import {
  User, Event, EventCardPreview
} from '@florinrelea/sparc-shared/models'
import { IEvent } from '@florinrelea/sparc-shared/@types/models/event/Event'
import deleteItemFromStorage from '../../../libs/modules/storage/delete'
import uploadBuffer from '../../../libs/modules/storage/upload-buffer'

const Models = {
  User,
  Event,
  EventCardPreview
}

function filterTime(timestamp_start: number, timestamp_end: number): string {
  function filterTimeLocally(timestamp: number): string {
    const localDate = new Date(timestamp)
    const time = {
      hour: localDate.getHours(),
      minutes:
        localDate.getMinutes() < 10
          ? `0${localDate.getMinutes()}`
          : localDate.getMinutes(),
      ampm: 'am'
    }
    if (time.hour > 12) {
      time.hour -= 12
      time.ampm = 'pm'
    } else if (time.hour === 12) {
      time.ampm = 'pm'
    } else if (time.hour === 0) {
      time.hour = 12
    }
    return `${time.hour}:${time.minutes} ${time.ampm.toUpperCase()}`
  }
  try {
    const start = filterTimeLocally(timestamp_start).replace(/AM|PM/ig, '')
    const end = filterTimeLocally(timestamp_end)
    return `${start} - ${end} EST`
  } catch (e) {
    return 'Invalid'
  }
}

function filterDate(timestamp: number): string {
  try {
    if (!timestamp) {
      throw new Error('Unexpected date format')
    }
    const date = new Date(timestamp)
    const days = [
      'Sunday',
      'Monday',
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Friday',
      'Saturday'
    ]
    const months = [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December'
    ]
    const filtered = {
      weekDay: days[date.getDay()],
      date: date.getDate(),
      monthName: months[date.getMonth()],
      year: date.getFullYear()
    }
    return `${filtered.weekDay}, ${filtered.monthName} ${filtered.date}, ${filtered.year}`
  } catch (e) {
    return 'Invalid'
  }
}
function spotsChecker(event: IEvent): string {
  if (event.event_type === 'virtual') {
    const total = event.capacity.virtual as number
    const counter = event.places_taken_virtual
    if (Date.now() < event.timestamp_start) {
      if (counter >= total) {
        return 'No spots left'
      }
      const count = total - counter
      if (count === 1) {
        return '1 Spot Left'
      }
      return `${count} Spots Left`
    }
    if (counter === 1) {
      return '1 Person Registered'
    }
    return `${counter} People Registered`
  }
  if (event.event_type === 'in Person') {
    const total = event.capacity.inperson as number
    const counter = event.places_taken_inperson
    if (Date.now() < event.timestamp_end) {
      if (counter >= total) {
        return 'No spots left'
      }
      const count = total - counter
      if (count === 1) {
        return '1 Spot Left'
      }
      return `${total - counter} Spots Left`
    }
    if (counter === 1) {
      return '1 Person Registered'
    }
    return `${counter} People Registered`
  }
  const total = event.capacity.virtual as number + (event.capacity.inperson as number)
  const counter = event.places_taken_virtual
    + event.places_taken_inperson
  if (Date.now() < event.timestamp_end) {
    if (counter >= total) {
      return 'No spots left'
    }
    const count = total - counter
    if (count === 1) {
      return '1 Spot Left'
    }
    return `${total - counter} Spots Left`
  }
  if (counter === 1) {
    return '1 Person Registered'
  }
  return `${counter} People Registered`
}

async function sendEngagementCard(
  req: Request,
  res: Response,
  next: NextFunction,
  eventId: string
): Promise<any> {
  let event
  let host
  try {
    event = await Models.Event.findOne({
      _id: eventId,
      private: {
        $ne: true
      }
    })
  } catch (e) {
    return next(e)
  }

  if (!event) {
    return res.status(404).send('<h1>404 - Engagement Not Found</h1>')
  }

  try {
    host = await Models.User.findOne({
      _id: event.created_by,
      'control_panel.profile_private': {
        $ne: true
      }
    })
  } catch (e) {
    console.error(e)
  }

  if (!host) {
    return res.status(404).send('<h1>Engagement Not Found</h1>')
  }

  let imageUrl: string | undefined

  // Check if image already stored
  let preStoredImage
  try {
    preStoredImage = await Models.EventCardPreview.findById(eventId)
  } catch (e) {
    return next(e)
  }

  if (preStoredImage) {
    // If the image is older then 6h then refresh it
    const updateInterval = 21600000
    const timePassedFromLastUpdate = Date.now() - preStoredImage.timestamp

    const doesNotRequireUpdate = timePassedFromLastUpdate <= updateInterval
    const isDeprecatedEvent = event.timestamp_end < Date.now() + updateInterval

    if (doesNotRequireUpdate || isDeprecatedEvent) {
      imageUrl = preStoredImage.image
    } else {
      try {
        await deleteItemFromStorage(preStoredImage.image)
      } catch (e) {
        console.error(e)
      }
    }
  }

  // Else render and store
  if (!imageUrl) {
    const htmlTemplate = fs.readFileSync('./components/templates/engagement-card.html', { encoding: 'utf-8' })
    let html = null
    let imageBuffer
    try {
      // eslint-disable-next-line no-eval
      html = eval(`\`${htmlTemplate}\``)
      // User "--no-sandbox" to solve the Ubuntu 18.04 error
      imageBuffer = await htmlToImage({ html, puppeteerArgs: { args: ['--no-sandbox'] } }) as string
    } catch (e) {
      return next(e)
    }

    try {
      const fileName = crypto.randomBytes(24).toString('hex')
      imageUrl = await uploadBuffer({ buffer: imageBuffer, path: `engagement-card-preview/${event._id}/${fileName}.png`, type: 'image' })
      await Models.EventCardPreview.findByIdAndUpdate(event._id, {
        _id: event._id,
        timestamp: Date.now(),
        image: imageUrl
      }, { upsert: true, new: true, setDefaultsOnInsert: true })
    } catch (e) {
      return next(e)
    }
  }

  const metaTypes: {
    [key: string]: string[]
  } = {
    title: [
      'title', 'og:title', 'twitter:title'
    ],
    description: [
      'description', 'og:description', 'twitter:description'
    ],
    image: [
      'image', 'og:image', 'og:image:secure_url', 'twitter:image'
    ]
  }

  let headContent = ''

  for (const type of Object.keys(metaTypes)) {
    let content = ''
    if (type === 'title') {
      content = event.event_name.length > 60 ? `${event.event_name.slice(0, 57)}...` : event.event_name
    } else if (type === 'image') {
      content = imageUrl
    } else if (type === 'description') {
      const fullDescription = event.event_description.replace(/\r?\n|\r/g, ' ')
      content = fullDescription.length > 155 ? `${fullDescription.slice(0, 152)}...` : fullDescription
    }
    const metaNames = metaTypes[type]
    for (const name of metaNames) {
      headContent += `\n<meta name="${name}" property="${name}" content="${content}" />`
    }
  }

  const htmlResponse = `
    <html>
    <head>
      <title>${event.event_name}</title>
      <meta property="og:locale" content="en_US" />
      <meta property="og:type" content="website" />
      <meta property="og:site_name" content="Sparc" />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta name="twitter:card" property="twitter:card" content="summary_large_image"/>
      ${headContent}
    </head>
    <body>
      <img src="${imageUrl}">
    </body>
  </html>
  `
  res.set('Content-Type', 'text/html')
  return res.status(200).send(Buffer.from(htmlResponse))
}

export default sendEngagementCard
