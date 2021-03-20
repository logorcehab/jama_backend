import { Router } from 'express'
// Router
import postRoute from './post'
import getRoute from './get'
import deleteRoute from './delete'

const router = Router()

router.use('/post', postRoute)
router.use('/get', getRoute)
router.use('/delete', deleteRoute)

export default router
