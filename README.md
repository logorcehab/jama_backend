# jama-backend
 Backend API for Jama Event Sharing and Promotion Service


# Routes
> Auth

     - auth/auth0/ : Auth0 authentication route
     - auth/auth0/callback : Redirect link after auth is verified by auth0
     - auth/login : Login Page
     - auth/logout: Logout Route

> Users

    + Admin
        -GET admin/get/attended-events: Get all authententicated user's attended events, Params(none)
        -GET admin/get/hosted-events: Get all authententicated user's hosted events, Params(none)
    + Billings
        -GET billings/get: Get all authenticated users billings, Params(none)
        -GET billings/export-pdf/Jama-Billings.pdf : Exports authenticated users billing as pdf
    + Calendar
    + Earnings
        -GET earnings/get: Get all user earnings
        -GET earnings/export-pdf/Jama-Earnings.pdf: Export auth users earnings as pdf
    + Events 
        -GET get/attented-events : Get all auth users attend events
        -GET get/hosted-events/:id: Get a users hosted events, Params(id: User Id)
    + Follow
        -POST follow/post/unfollow/id: Unfollow user by user id
        -POST follow/post/follow/id: follow user by user id
    + Get
        -GET get/followers/:userId: Get users follower, Params(id: userId)
        -GET get/following/:userId: Get users userId follow, Params(id: userId)
        -GET get/me/additional-info: Get auth users additional info
        -GET get/me/all: Get auth users info
        -GET get/basic/id/:id: Get users basic info, Params(id: userId)
        -GET get/q/:id: Get users public info, Params(id: userId)
    + Interests
        -DELETE interests/delete/:id: Delete events user is interested in , Params(id: eventId)
        -GET interests/get/:id: Get events user is interestred in, Params(id: eventId)
        -POST interests/post/:id: Add events user is interestred in, Params(id: eventId)
    + Messages
        -DELETE messages/group/delete/member/:groupId/:userId: Removes group member,Params(groupId, userId)
        -POST messages/group/post/add-users: Adds users to group, Params(Array of users, groupId)
        -POST messages/group/post/create: Creates new group, Params(new members,group image, goup name)
        -PATCH messages/patch/blockfromid/:id/:state: Sets blocking or unblocking users from messaging a user, Params(id: User id, state: True or False(Block or unblock))
        -PATCH messages/patch/smsnotifications/:state: Sets blocking or unblocking sms notifications a user, Params(state: True or False(Block or unblock))
        -PATCH messages/patch/emailnotifications/:state: Sets blocking or unblocking email notifications a user, Params(state: True or False(Block or unblock))
        -POST messages/post/send-message-to-user: Sends messages from user id to user id, Params(id*: RecieverId, text*: message, attatchments)
    + Profile
        -DELETE profile/delete/profile-image: Deletes users profile image
        -DELETE profile/delete/event-highlight: Deletes users event highlight, Params(event_highlight: event highlight id)
        -PUT profile/put/additional-info: Adds user's additional information, Params(payload: Any additional information)
        -PUT profile/put/profile-image: Adds a profile picture to user's account. Params(files.profile_image)
        -PUT profile/put/profile: Adds users profile details. Params(payload: Any user profile information)
        -PUT profile/put/event-highlight: Adds user event highlight. Params(event: event id, event_highlight: event hilight video or image file)
        -GET /profile/notifications: Gets user's event recommendation notification.
        -PATCH profile/notifications/events-recommendations/:status: Sets event recommendation to true or false. Params(status: boolean).
        -PATCH profile/prop/:prop/:status:: Sets user props profile_private, disabled_share, disabled_messages, followers_notifs, show_followers, show_followed to true or false. Params(prop: prop name, status: boolean)
    + Query
        -GET query/q: Get user but string. Param(q: string(user's firstname, lastname, fullname or username))
        -GET query/usernames/connections: Search usernames matching string input from connnection
        -GET query/usernames/complete: Search usernames matching string input from whole database
    + Ratings
        -GET ratings/get/id/:id: Get a hosts ratings by id. Param(id: hosts id)
    +Tooltip
        -GET /tooltip/:userId: Get user basic public info. Param(userId: users Id)

> Analytics

    + Views
        -GET events/get/all/:id: Get all event views. Param(id: event id)
        -GET events/get/today/id/:id: Get today event views. Param(id: event id)
        -GET events/get/week/id/:id: Get week event views. Param(id: event id)
        -GET events/get/total/id/:id: Get total event views. Param(id: event id)
