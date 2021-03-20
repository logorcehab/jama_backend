import { IEvent, IEventDocument } from '../../../models/event/Event'
import { IUser } from '../../../models/user/User'
import getEventTakenPlaces from '../../functions/events/get-event-taken-places'

interface IExtendedEvent extends IEvent {
  [key: string]: any
}

async function generatePublicEvent(
  event: IEventDocument,
  host: IUser,
  authId: string
): Promise<IExtendedEvent | any> {
  if (!event || !host) {
    return {}
  }

  // Collect event data
  const requiredProps: (keyof IEvent)[] = ['capacity', 'event_image', 'event_video', 'attachments', 'created_by', 'timestamp_start', 'timestamp_end', 'event_description', 'event_name', 'price', '_id', 'settings', 'places_taken']

  let responseEvent: {
    [key: string]: any
  } = {}

  requiredProps.forEach(prop => {
    if (typeof event[prop] !== 'undefined') {
      responseEvent[prop] = event[prop]
    } else {
      responseEvent[prop] = null
    }
  })

  // Collect host props
  responseEvent.host = {}

  const requiredHostProps: (keyof IUser)[] = ['_id', 'first_name', 'last_name', 'number_of_followers', 'number_of_followed', 'host_rating', 'guest_rating', 'control_panel', 'profile_image', 'website', 'facebook', 'instagram', 'twitter', 'linkedin']
  requiredHostProps.forEach(prop => {
    if (typeof host[prop] !== 'undefined') {
      responseEvent.host[prop] = host[prop]
    }
  })

  // Check if auth is the host
  if (authId === event.created_by) {
    responseEvent.host.is_host = true
  }
  // Reassign rating property
  responseEvent.host.rating = responseEvent.host.host_rating

  // Check for maps


  responseEvent = { ...responseEvent, ...getEventTakenPlaces(event) }

  return responseEvent
}

export default generatePublicEvent
