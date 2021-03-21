import { Router } from 'express'
// Routes
import interests from './interests'
import members from './members'
import surveys from './surveys'

import deleteRoute from './methods/delete'
import post from './methods/post'
import patch from './methods/patch'
import get from './methods/get'
import put from './methods/put'
import guests from './guests'

const router = Router()

router.use('/interests', interests)
router.use('/members', members)
router.use('/surveys', surveys)

router.use('/delete', deleteRoute)
router.use('/post', post)
router.use('/patch', patch)
router.use('/get', get)
router.use('/put', put)
router.use('/guests', guests)

export default router
