import express from "express"
import passport from "passport"
const router = express.Router()

declare module 'express-session' {
  export interface SessionData {
    returnTo: string;
  }
}

router.get('/', passport.authenticate('auth0', {
    scope: ['profile openid email']
}))

router.get('/callback', (req, res, next) => {
  passport.authenticate("auth0", {session: true}, (err, user, info) => {
    if (err) {
      return next(err);
    }
    if (!user) {
      return res.redirect("/login");
    }
    req.logIn(user, (error) => {
      if (err) {
        return next(error);
      }
      const returnTo = req.session.returnTo;
      delete req.session.returnTo;
      res.redirect(returnTo || "/home");
    });
  })(req, res, next);
});
export default router