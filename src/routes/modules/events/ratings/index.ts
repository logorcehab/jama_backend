import { Router } from 'express'
// Router
import post from './methods/post'
import get from './methods/get'

const router = Router()

router.use('/post', post)
router.use('/get', get)

export default router
