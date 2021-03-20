import { Router } from 'express'
import post from './post'
import deleteRoute from './delete'

const router = Router()

router.use('/post', post)
router.use('/delete', deleteRoute)

export default router
