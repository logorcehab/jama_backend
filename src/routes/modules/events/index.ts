import { Router } from 'express'
import authentification from '../../../middlewares/authentification'

import requests from './requests'
import waitlist from './waitlist'
import admin from './admin'
import ratings from './ratings'
import get from './get'
import confirmation from './confirmation'
import complaint from './complaint'
import surveys from './surveys'

const router = Router()

router.use('/requests', requests)
router.use('/waitlist', waitlist)
router.use('/ratings', ratings)
router.use('/get', get)
router.use('/confirmation', confirmation)

router.use(authentification)

router.use('/surveys', surveys)
router.use('/admin', admin)
router.use('/complaint', complaint)

export default router
