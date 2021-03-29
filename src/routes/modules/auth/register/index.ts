import express from "express"
import generateUsername from '../../../../libs/functions/users/generate-username';
import { User} from '../../../../models'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'

const Models = {
    User
}

const router = express.Router()
router.post('/',async(req, res)=>{
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
        return res.status(200).json({result,token})
    } catch (error) {
        console.log(error)
        res.status(500).send({message:'Something went Wrong'})
    }
})

export default router