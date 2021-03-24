import passport from 'passport';
import express from 'express';
const router = express.Router()
import { User} from '../models'

const Models = {
    User
}

import auth from './modules/auth'
import users from './modules/users'
import generateUsername from '../libs/functions/users/generate-username';

router.use('/auth',auth)

router.use('/users', users)


// Test Routes
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

router.post('/test/signup',async(req, res)=>{
    const {firstName,lastName, email, password, confirmPassword} = req.body
    try {
        const user  = await Models.User.findOne({email})
        if(user && user.auth_provider !== 'EmailPass') return res.status(409).send({message:`Sign in with ${user.auth_provider} instead`})
        if(user) return res.status(409).send({message:'User exists'})
        if(password !== confirmPassword) return res.status(409).send({message:'Passwords Do not match'})

        const hashedPassword = await bcrypt.hash(password, 12)
        // Generate Username
        const username = await generateUsername(firstName,lastName)
        const result = await Models.User.create({
            email,
            username,
            password: hashedPassword,
            first_name: firstName,
            last_name: lastName,
            auth_provider: 'EmailPass'
        })
        const token = jwt.sign({email:result.email,id:result._id },process.env.SESSION_SECRET, {expiresIn:'1h'})
        return res.status(200).json({result:user,token})
    } catch (error) {
        console.log(error)
        res.status(500).send({message:'Something went Wrong'})
    }
})
router.post('/test/social-auth',async(req, res)=>{
    const {firstName,lastName, email, auth_provider} = req.body
    try {
        const user  = await Models.User.findOne({email})
        if(user && user.auth_provider !== auth_provider) return res.status(210).json({message:`Sign in with ${user.auth_provider} instead`})
        if(user) return res.status(211).json({message:'User exists'})
        // Generate Username
        let username
        try {
            username = await generateUsername(firstName,lastName)
        } catch (error) {
            console.log(error)
        }

        const result = await Models.User.create({
            email,
            username,
            auth_provider,
            first_name: firstName,
            last_name: lastName,
        })
        return res.status(200).json({result})
    } catch (error) {
        console.log(error)
        return res.status(500).json({message:'Something went Wrong'})
    }
})

router.post('/test/login', async (req, res)=>{
    const {email,password} = req.body

    try {
        const user  = await Models.User.findOne({email})
        if(!user) return res.status(404).json({message:'User does not exist'})
        if(user && user.auth_provider !== 'EmailPass') return res.status(400).json({message:`Sign in with ${user.auth_provider} instead`})
        const isPasswordCorrect = await bcrypt.compare(password,user.password)
        if(!isPasswordCorrect) return res.status(404).json({message:'Incorrect Credentials'})

        const token =jwt.sign({email:user.email, id: user._id}, process.env.SESSION_SECRET, {expiresIn: "1h"})
        return res.status(200).json({result:user, token})
    } catch (error) {
        console.log(error)
        res.status(500).json({message:'Something went Wrong'})
    }
})
router.get('/home',(req,res)=>{
    res.render('home');
})

export default router