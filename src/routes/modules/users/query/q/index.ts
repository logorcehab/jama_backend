import { Router } from 'express'
import { User } from '../../../../../models'
import validation from '../../../../../libs/modules/validation'
// Models

const Models = {
  User
}
const router = Router()

function getUserBasicData(auth: any, user: any, checkers: any) {
  let result: any
  if (checkers.connection) {
    const sm = auth.jama_messages
    let connection = null
    if (sm && sm.connections) {
      const conns = sm.connections
      let tunnel = ''
      for (const id in conns) {
        if (conns[id].uid === user._id) {
          tunnel = id
          break
        }
      }
      if (tunnel) {
        const { lastMessage } = sm.connections[tunnel]
        let newMessages = false
        if (sm.new_messages) {
          if (sm.new_messages[tunnel]) {
            newMessages = true
          }
          for (const id of sm.new_messages) {
            const localMess = id
            if (localMess.uid === user._id) {
              newMessages = true
            }
          }
        }
        connection = {
          id: tunnel,
          last_message: lastMessage.message,
          last_timestamp: lastMessage.timestamp,
          newMessages
        }
      }
      result.connection = connection
    }
  }

  result = {
    _id: user._id,
    first_name: user.first_name,
    last_name: user.last_name,
    profile_image: user.profile_image,
    age: user.age,
    attended_events: user.attended_events,
    headline: user.headline,
    ratings: user.rating ? user.host_rating : {},
    attendance_rate: user.attendance_rate,
    connection: null,
    control_panel: user.control_panel || { profile_private: false }
  }
  return result
}

router.get('', async (req, res, next) => {
  try {
    const authId = req.user
    const q = req.query
    // Validation
    if (!q || typeof q.term !== 'string') {
      return res.status(400).json({ error: 'wrong query' })
    }
    const term = q.term.toLowerCase()
    // Additional params
    const checkConnection = q.connection === 'true'
    const auth = await Models.User.findById(authId)
    // Search by email
    if (validation.email(term)) {
      // Single result
      const user = await Models.User.findOne({
        _id: {
          $ne: authId
        },
        email: term as string,
        'control_panel.profile_private': {
          $ne: true
        }
      })

      const result = getUserBasicData(auth, user, { connection: checkConnection })
      return res.status(200).json({ results: [result] })
    }
    // Multiple results possible

    const fullName = term.toLowerCase()

    let nameQuery
    // Search by 1 name
    if (!fullName.includes(' ')) {
      nameQuery = [
        {
          first_name: {
            $regex: fullName, $options: 'i'
          }
        },
        {
          last_name: {
            $regex: fullName, $options: 'i'
          }
        }
      ]
    } else {
      // Search by first/last name
      const firstNameInput = (fullName.split(' '))[0]
      const lastNameInput = (fullName.split(' '))[1]
      nameQuery = [
        {
          first_name: {
            $regex: firstNameInput, $options: 'i'
          },
          last_name: {
            $regex: lastNameInput, $options: 'i'
          }
        },
        {
          last_name: {
            $regex: firstNameInput, $options: 'i'
          },
          first_name: {
            $regex: lastNameInput, $options: 'i'
          }
        }
      ]
    }

    const results = await Models.User.find({
      _id: {
        $ne: authId
      },
      'control_panel.profile_private': {
        $ne: true
      },
      $or: nameQuery
    }) || []

    const finalResults = []
    if (results.length !== 0) {
      for (const user of results) {
        const formattedUser = getUserBasicData(auth, user, { connection: checkConnection })
        finalResults.push(formattedUser)
      }
    }
    return res.status(200).json({ results: finalResults })
  } catch (e) {
    return next(e)
  }
})

export default router
