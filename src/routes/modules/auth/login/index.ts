import express from "express"
import { User} from '../../../../models'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'

const Models = {
    User
}

const router = express.Router()

router.post('/', async (req, res)=>{
    const {email,password} = req.body

    try {
        const user  = await Models.User.findOne({email})
        if(!user) return res.status(404).send({message:'User does not exist'})
        if(user && user.auth_provider !== 'EmailPass') return res.status(400).send({message:`Sign in with ${user.auth_provider} instead`})
        const isPasswordCorrect = await bcrypt.compare(password,user.password)
        if(!isPasswordCorrect) return res.status(404).send({message:'Incorrect Credentials'})

        const token =jwt.sign({email:user.email, id: user._id}, process.env.SESSION_SECRET, {expiresIn: "1h"})
        return res.status(200).json({result:user, token})
    } catch (error) {
        console.log(error)
        res.status(500).json({message:'Something went Wrong'})
    }
})

export default router;