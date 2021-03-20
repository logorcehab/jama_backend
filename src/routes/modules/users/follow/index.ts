import { Router } from 'express'
// Router
import post from './post'

const router = Router()

router.use('/post', post)

export default router
