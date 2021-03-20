import { Router } from 'express'
import { IUser, IUserEventHighLight } from '../../../../models/user/User'
import { User, Event } from '../../../../models'
import validation from '../../../../libs/modules/validation/index'
import queryRoute from './q'

// Models

const Models = {
  User,
  Event
}

const router = Router()

router.use('/q', queryRoute)

// Search usernames matching string input from connnection
router.get('/usernames/connections', async (req, res, next) => {
  try {
    const authId = req.user
    const userDocument: IUser | { jama_messages: any } = await Models.User.findById(authId, 'jama_messages') || { jama_messages: {} }
    const connections = userDocument.jama_messages.connections || []
    const results = []
    if (connections) {
      const allUsers: any[] = await Models.User.find()
      for (const connection of connections) {
        const { uid } = connection
        if (!uid) continue
        const user = allUsers[uid]
        if (!user) continue
        const dataPack = {
          username: user.username,
          id: user._id,
          name: `${user.first_name} ${user.last_name}`,
          profile_image: user.profile_image
        }
        results.push(dataPack)
      }
    }
    return res.status(200).json({ results })
  } catch (e) {
    return next(e)
  }
})

// Search usernames matching string input from whole database
router.get('/usernames/complete', async (req, res, next) => {
  try {
    // Validation
    const q: string = req.query.q as string
    if (q.length < 3) {
      return res.status(400).json({ error: 'This word is too short!' })
    }
    const auth = req.user
    const query = q.toLowerCase()
    const all = await Models.User.find()
    const results = []
    // Search by email
    if (validation.email(query) === true) {
      for (const user of all) {
        if (user.email === query) {
          const formattedUser: any = { ...user, track_by: 'email' }
          results.push(formattedUser)
          break
        }
      }
    } else if (query.includes(' ')) {
      // Search by first + last name
      const fn = query.split(' ')[0]
      const ln = query.split(' ')[1]
      for (const id of all) {
        const u = id
        if (u.control_panel && u.control_panel.profile_private) continue
        u.first_name = u.first_name.toLowerCase()
        u.last_name = u.last_name.toLowerCase()
        const conds = {
          0: (u.first_name === fn) && u.last_name.includes(ln),
          1: (u.first_name === ln) && u.last_name.includes(fn),
          2: (u.last_name === fn) && u.first_name.includes(ln),
          3: (u.last_name === ln) && u.first_name.includes(fn)
        }
        if (conds[0] || conds[1] || conds[2] || conds[3]) {
          if (u.id !== auth) results.push(u)
        }
      }
    } else {
      // Search by first 3 letters
      const match = (query.slice(0, 3)).toLowerCase()
      for (const id of all) {
        const u = id
        u.first_name = u.first_name.toLowerCase()
        u.last_name = u.last_name.toLowerCase()
        const conds = {
          0: u.first_name.includes(match),
          1: u.last_name.includes(match)
        }
        if (conds[0] || conds[1]) {
          if (u.id !== auth) results.push(u)
        }
      }
    }
    const response = []
    if (results) {
      for (const user of results) {
        const _user: {
          id: string
          name: string
          profile_image: string
          track_by: any
          email: any
        } = {
          id: user._id,
          name: `${user.first_name} ${user.last_name}`,
          profile_image: user.profile_image,
          track_by: null,
          email: null
        }

        if (user.track_by === 'email') {
          _user.track_by = user.track_by
          _user.email = user.email
        }
        response.push(_user)
      }
    }
    return res.status(200).json({ results: response })
  } catch (e) {
    return next(e)
  }
})

export default router
