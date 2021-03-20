import { Router } from 'express'
// Routes
import post from './post'
import patch from './patch'
import group from './group'

const router = Router()

router.use('/post', post)
router.use('/patch', patch)
router.use('/group', group)

export default router
