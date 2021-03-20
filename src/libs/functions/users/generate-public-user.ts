import { User, Tag, UserConnection } from '../../../models'
import { IUser } from '../../../models/user/User'
import userAnalytics from '../../modules/users/analytics'

const Models = {
  User,
  Tag,
  UserConnection
}

export type IPublicUser = Pick<IUser, '_id' | 'about' | 'headline' | 'followed_by' |'event_highlights'| 'following' | 'instagram' | 'interest_tags' | 'first_name' | 'last_name' | 'linkedin' | 'profile_image' | 'profile_video' | 'twitter' | 'website' | 'facebook' | 'attended_events' | 'hosted_events' | 'rated_events' | 'control_panel' | 'host_rating' | 'guest_rating' | 'attendance_rate' | 'additional_info' | 'number_of_followers' | 'number_of_followed' | 'number_of_attended_events' | 'number_of_hosted_events'> & {
  connection: {
    id: string
    last_message: string
    last_timestamp: number
    new_messages: boolean
  } | null
}

async function query(userQuery: string, authId: string): Promise<IPublicUser> {
  if (!userQuery) {
    throw new Error('Expected user id')
  }
  if (!authId) {
    throw new Error('Expected auth user id')
  }
  const auth = await Models.User.findById(authId)
  let user

  // Usernames contain .
  user = await Models.User.findOne({
    _id: userQuery,
    'control_panel.profile_private': {
      $ne: true
    }
  })

  if (!auth || !user) {
    throw new Error('404')
  }

  const sm = auth.jama_messages
  let connection: IPublicUser['connection'] | null = null
  if (sm && sm.connections) {
    const conns = sm.connections
    let tunnel = ''
    for (const id in conns) {
      if (conns[id].uid === user._id) {
        tunnel = id as string
        break
      }
    }
    if (tunnel) {
      const { last_message } = conns.find(el => el._id === tunnel) || {}
      let newMessages = false
      if (sm.new_messages) {
        for (const index of sm.new_messages) {
          const localMess = index
          try {
            const connectionDocument = await Models.UserConnection.findOne({
              _id: localMess._id,
              type: {
                $ne: 'group'
              }
            }, 'user_1 user_2')
            if (connectionDocument) {
              if (
                connectionDocument.user_1 === user._id
                || connectionDocument.user_2 === user._id
              ) {
                newMessages = true
              }
            }
          } catch (e) {
            console.error(e)
          }
        }
      }
      connection = {
        id: tunnel,
        last_message: last_message?.message || 'No text content',
        last_timestamp: last_message?.timestamp || 0,
        new_messages:newMessages
      }
    }
  }
  const interestTags = []

  for (const tagId of user.interest_tags || []) {
    const val = await Models.Tag.findById(tagId)
    if (val) {
      interestTags.push(val.value)
    }
  }
  const fetched: IPublicUser = {
    _id: user._id,
    about: user.about,
    headline: user.headline,
    followed_by: user.followed_by,
    following: user.following,
    instagram: user.instagram,
    interest_tags: interestTags,
    first_name: user.first_name,
    last_name: user.last_name,
    linkedin: user.linkedin,
    profile_image: user.profile_image,
    profile_video: user.profile_video,
    event_highlights: user.event_highlights,
    twitter: user.twitter,
    website: user.website,
    facebook: user.facebook,
    attended_events: user.attended_events,
    hosted_events: user.hosted_events,
    rated_events: user.rated_events,
    control_panel: user.control_panel,
    connection,
    host_rating: user.host_rating,
    guest_rating: user.guest_rating,
    attendance_rate: user.attendance_rate,
    additional_info: {
      hometown: ''
    },
    number_of_followers: user.number_of_followers,
    number_of_followed: user.number_of_followed,
    number_of_attended_events: user.number_of_attended_events,
    number_of_hosted_events: user.number_of_hosted_events
  }

  await userAnalytics.views.addUserView(user._id)
  return fetched
}

export default query
