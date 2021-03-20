import express from "express"
import passport from "passport"

import login from './login'
import logout from './logout'
import auth0 from './auth0'

const router = express.Router()

router.use('/login', login)
router.use('/logout', logout)
router.use('/auth0', auth0)

export default router