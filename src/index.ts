import express, { json } from "express"

// import * as path from "path"
import cookieParser from "cookie-parser"
import mongoose from 'mongoose'
import * as dotenv from "dotenv"
import passportConfig from './configs/passport'
import routes from './routes'
import passport from 'passport'
import session from 'express-session'
dotenv.config()



const app = express();
const port = process.env.PORT

// Configs Files
mongoose.connect(process.env.DBLINKLOGORCEHAB, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    useFindAndModify: false
},
() => {
    console.log(`\x1b[32mConnected to database -> ${new Date().toISOString()}`)
})

const sess = {
    secret: process.env.SESSION_SECRET,
    cookie: {
        secure: false
    },
    resave: false,
    saveUninitialized: true
};

if (app.get('env') === 'production') {
    // Use secure cookies in production (requires SSL/TLS)
    sess.cookie.secure = true;
    // Uncomment the line below if your application is behind a proxy (like on Heroku)
    // or if you're encountering the error message:
    // "Unable to verify authorization request state"
    // app.set('trust proxy', 1);
}
app.use(json());
app.use(cookieParser());
app.use(session(sess));
app.use(passport.initialize());
app.use(passport.session());

// Middleware to attatch request to user


passportConfig()
app.use((req, res, next) => {
  res.locals.isAuthenticated = req.isAuthenticated();
  next();
});
app.use('/', routes)

app.set('view engine', 'ejs')

app.listen(port,()=>{
    console.log('app now listening on port:'+port)
})


