import { IEvent } from '../../models/event/Event'

export const event: {
  LEAVE_RATING_RANGE: number
  CONFIRM_ATTENDANCE_RANGE: number
  PAID_ENGAGEMENT_COMPLAINT_RANGE: number
  MAX_VIDEO_SIZE: number
  MAX_IMAGE_SIZE: number
  MAX_ATTACHMENT_SIZE: number
  REGISTRATION_LABELS: (keyof IEvent)[]
} = {
  LEAVE_RATING_RANGE: 259200000, // 72 hours
  CONFIRM_ATTENDANCE_RANGE: 259200000, // 72 hours
  PAID_ENGAGEMENT_COMPLAINT_RANGE: 129600000, // 36 hours,
  MAX_VIDEO_SIZE: 250000000, // 250 MB
  MAX_IMAGE_SIZE: 10000000, // 10 MB
  MAX_ATTACHMENT_SIZE: 10000000, // 10 MB
  REGISTRATION_LABELS: ['users_attending', 'pending_payment_confirmation']
}
export const user = {
  messages: {
    MAX_ATTACHMENT_SIZE: 10485760 // MB
  },
  calendar: {
    OAUTH2_AUTHORIZATION_INTERVAL: 604800000 // 7 days
  }
}

export default {
  event,
  user
}
