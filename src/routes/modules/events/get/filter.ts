import { Router } from 'express'
import https from 'https'
import { Event, User } from '@florinrelea/sparc-shared/models'
import { IEvent } from '@florinrelea/sparc-shared/@types/models/event/Event'
import { IUserDocument } from '@florinrelea/sparc-shared/@types/models/user/User'
import checkIfAuthentificated from '../../../../middlewares/check-if-authentificated'
import generatePublicEvent from '../../../../libs/modules/events/generate-public-event.js'

const Models = {
  Event,
  User
}

const httpsRequest = {
  get: (url: string) => new Promise<string>((res_01, rej_01) => {
    const request = https.get(url, (res) => {
      let data = ''
      res.on('data', (chunk) => {
        data += chunk
      })

      res.on('end', () => {
        res_01(data)
      })
      res.on('error', (e) => {
        rej_01(e)
      })
    })
    request.end()
  })
}
async function getDataFromAddress(address: string) {
  try {
    const query = encodeURI(address)
    const resp = await httpsRequest.get(`https://maps.googleapis.com/maps/api/geocode/json?address=${query}&sensor=true&key=${process.env.GOOGLE_MAPS_GEOCODING_API_KEY}`)
    return resp
  } catch (e) {
    console.log(`Could not get location data from string: "${address}"`)
    console.log(e)
    return ''
  }
}

const router = Router()

router.use(checkIfAuthentificated)

router.get('/', async (req, res, next) => {
  const auth_id = (res.locals && res.locals.user) ? res.locals.user : ''
  // Set defaults
  let time = 'all'
  let tags = []
  let engagementType = 'all'
  let location = null
  let locationProximity = null
  let dateFrom = null
  let dateTo = null

  let limit = 10
  let lastId = null
  let orderBy = 'time'
  let order = 'asc'
  // Check query
  if (req.query) {
    const q: {
      [key: string]: any
    } = req.query
    if (q.time) {
      if (q.time === 'passed') {
        time = 'passed'
      } else {
        time = q.time === 'upcoming' ? 'upcoming' : 'both'
      }
    }
    if (q.tags) {
      // Check array
      let t = []
      try {
        t = JSON.parse(String(q.tags))
      } catch (e) {
        console.error(e)
      }
      if (t.length) tags = t
    }
    if (q.engagementType) engagementType = q.engagementType
    if (q.location) location = q.location
    if (q.locationProximity) locationProximity = parseInt(q.locationProximity, 10)
    if (q.dateFrom) dateFrom = parseInt(q.dateFrom, 10)
    if (q.dateTo) dateTo = parseInt(q.dateTo, 10)
    if (q.limit) limit = parseInt(q.limit, 10)
    if (q.lastId) lastId = q.lastId
    if (q.orderBy) orderBy = q.orderBy
    if (q.order) order = q.order
  }
  const executionStart = Date.now()
  const filter: Partial<{
    [P in keyof IEvent]: any
  }> = {
    private: {
      $ne: true
    }
  }
  const sort: {
    [key: string]: number
  } = {}
  // By Time
  if (time === 'passed') {
    filter.timestamp_end = { $lte: Date.now() }
  } else if (time === 'upcoming') {
    filter.timestamp_end = { $gt: Date.now() }
  }
  // By Tags
  if (tags.length) {
    filter.tags = {
      $in: tags
    }
  }
  // By Engagement Type
  if (engagementType && (engagementType !== 'all')) {
    const types = JSON.parse(engagementType)
    filter.event_type = {
      $in: types
    }
  }
  // By Date
  if (dateFrom) {
    filter.timestamp_start = {
      $gte: dateFrom
    }
  }
  if (dateTo) {
    filter.timestamp_end = {
      $lte: dateTo
    }
  }

  // Order
  if (orderBy === 'time') {
    if (order === 'desc') {
      sort.timestamp_end = -1
    } else {
      sort.timestamp_end = 1
    }
  }

  let results

  try {
    results = await Models.Event.find(filter).sort(sort)
  } catch (e) {
    return next(e)
  }

  // By location
  if (location) {
    let locationData
    try {
      locationData = await getDataFromAddress(location)
    } catch (e) {
      console.error(e)
    }

    if (locationData) {
      let googleMapsParsedData
      try {
        googleMapsParsedData = (JSON.parse(locationData).results[0].geometry).location
      } catch (e) {
        console.error(e)
      }
      const mapData = {
        lat: Number(googleMapsParsedData.lat),
        lng: Number(googleMapsParsedData.lng)
      }
      if (mapData.lat && mapData.lng) {
        let proximity = 1609.34 // transform to meters
        if (locationProximity) {
          proximity = locationProximity * 1609.34 // transform to meters
        }
        const rad = function rad(x: number) { return (x * Math.PI) / 180 }
        function getDistance(p1: { lat: number, lng: number }, p2: { lat: number, lng: number }) {
          const R = 6378137 // Earth’s mean radius in meter
          const dLat = rad(p2.lat - p1.lat)
          const dLong = rad(p2.lng - p1.lng)
          const a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
            + Math.cos(rad(p1.lat)) * Math.cos(rad(p2.lat))
            * Math.sin(dLong / 2) * Math.sin(dLong / 2)
          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
          const d = R * c
          return d
        }

        results = results.filter(event => {
          let coordinates: {
            lat: number
            lng: number
          }
          if (event.locations && event.locations.default) {
            coordinates = JSON.parse(event.locations.default)
          } else if (event.locations && event.locations.accepted) {
            coordinates = JSON.parse(event.locations.accepted)
          } else {
            return false
          }
          const meters = getDistance({
            lat: mapData.lat,
            lng: mapData.lng
          }, coordinates)
          return meters <= proximity
        })
      }
    }
  }

  // Get from last id
  if (lastId) {
    let indexOfId = 0
    for (const i in results) {
      if (results[i].id === lastId) {
        indexOfId = parseInt(i, 10) + 1
      }
    }
    results = results.slice(indexOfId)
  }

  // Finish filters <---

  const cachedUsers: {
    [key: string]: IUserDocument
  } = {}

  // Remove wrong events and cached users
  for (const i in results) {
    const event = results[i]
    let host
    // Check if the cached users contains the user
    if (cachedUsers[event.created_by]) {
      host = cachedUsers[event.created_by]
    } else {
      // Get the user from db
      try {
        host = await Models.User.findById(event.created_by)
      } catch (e) {
        console.error(e)
      }

      // Cache user
      if (host && (!host.control_panel || !host.control_panel.profile_private)) {
        cachedUsers[host._id] = host
      }
    }
    if (
      !host
      || (host.control_panel && (host.control_panel.profile_private === true))
    ) {
      delete results[i]
    }
  }
  // Clean empty items
  results = results.filter(event => event != null)

  const resultsCount = results.length

  // Limit results
  results = results.slice(0, limit)

  // Assign public data
  for (const index in results) {
    const event = results[index]
    const host = cachedUsers[event.created_by]
    results[index] = await generatePublicEvent(event, host, auth_id)
  }

  const executionTime = Date.now() - executionStart

  return res.status(200).json({
    executionTime, resultsCount, resultsLimit: limit, results
  })
})

export default router
