import express from "express"
import generateUsername from '../../../../libs/functions/users/generate-username';
import { User} from '../../../../models'

const Models = {
    User
}

const router = express.Router()

router.post('/',async(req, res)=>{
    const {firstName,lastName, email, auth_provider} = req.body
    try {
        const user  = await Models.User.findOne({email})
        if(user && user.auth_provider !== auth_provider){
            if(user.auth_provider === 'EmailPass'){
                return res.status(409).send({message:`User Exists. Sign in with Email and Password.`})
            }
            return res.status(409).send({message:`Sign in with ${user.auth_provider} instead`})
        }
        if(user) return res.status(200).json({result: user})
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

export default router