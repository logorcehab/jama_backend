import express from "express"
import querystring from 'query-string'

const router = express.Router()

router.get("/", (req, res) => {
  req.logOut();

  let returnTo = req.protocol + "://" + req.hostname ;
  const port = req.socket.localPort;

  if (port !== undefined && port !== 80 && port !== 443) {
    returnTo =
      process.env.NODE_ENV === "production"
        ? `${returnTo}/`
        : `${returnTo}:${port}/home`;
  }

  const logoutURL = new URL(
    `https://${process.env.AUTH0_DOMAIN}/v2/logout`
  );

  const searchString = querystring.stringify({
    client_id: process.env.AUTH0_CLIENT_ID,
    returnTo
  });
  logoutURL.search = searchString;

  res.redirect(logoutURL.toString());
});
export default router