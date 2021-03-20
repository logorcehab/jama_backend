import Auth0Strategy from "passport-auth0";
import passport from "passport"
import { User } from "../models";
import generateUsername from '../libs/functions/users/generate-username'
import { IUserDocument } from "../models/user/User";

const Models = {
    User
}


export default function passportConfig()
{
    const strategy = new Auth0Strategy(
        {
        domain: process.env.AUTH0_DOMAIN,
        clientID: process.env.AUTH0_CLIENT_ID,
        clientSecret: process.env.AUTH0_CLIENT_SECRET,
        callbackURL:
        process.env.AUTH0_CALLBACK_URL || '/auth/auth0/callback'
    },
    async (accessToken, refreshToken, extraParams, profile, done)=>{
        // Passport callback function
        // accessToken is the token to call Auth0 API (not needed in the most cases)
        // extraParams.id_token has the JSON Web Token
        // profile has all the information from the user
        try {
            const user = await Models.User.findOne({email: profile.emails[0].value})
            if (user){
                if (user.auth_provider !== profile.provider){
                    console.log('Account Exists please login in with your default provider')
                    return
                }
                else {
                    console.log('Account Exists Redirecting')
                    done(null,user)
                }
            }
            else {
                const newUser = await Models.User.create({
                    username: await generateUsername(profile.name?.givenName, profile.name?.familyName),
                    auth_id: profile.id,
                    auth_provider: profile.provider,
                    first_name: profile.name?.familyName,
                    last_name: profile.name?.givenName,
                    email: profile.emails[0].value,
                })
                done(null,newUser)
            }

            //
        } catch (err) {
            console.log(err)
        }
    }
    )

    passport.use(strategy);

    passport.serializeUser(async (user: IUserDocument,done)=>{
        done(null,user._id);
    })

    passport.deserializeUser( async (id,done)=>{
        const user = await Models.User.findById(id)
        done(null,user._id);
    })
}