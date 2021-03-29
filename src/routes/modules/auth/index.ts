import express from "express"

import login from './login'
import register from './register'
import socialAuth from './social-auth'

const router = express.Router()

router.use('/login', login)
router.use('/register', register)
router.use('/social-auth', socialAuth)

export default router