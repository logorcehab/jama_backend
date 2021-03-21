import express from 'express';
import passport from 'passport'
const router = express.Router()


import auth from './modules/auth'
import users from './modules/users'

router.use('/auth',auth)

router.use('/users', passport.authenticate('basic', { session: false }), users)

router.get('/home',(req,res)=>{
    res.render('home');
})

export default router