import { User, UserAnalytics } from '../../../../models'

const Models = {
  User,
  UserAnalytics
}

const namespace = {
  async addUserView(uid: string): Promise<void> {
    if (!uid) {
      throw new Error('Invalid user id!')
    }
    const now = new Date()
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
    const user = await Models.User.findById(uid)
    if (!user) {
      throw new Error('User not found')
    }
    let counter = 0
    const analytics = await Models.UserAnalytics.findById(user._id).select('views')
    const { views } = analytics || {}
    if (views && views[date]) {
      counter = views[date]
    } else {
      await Models.UserAnalytics.findByIdAndUpdate(user._id, {
        $set: {
          [`views.${date}`]: 1
        }
      }, { upsert: true })
    }

    counter += 1
    await Models.UserAnalytics.findByIdAndUpdate(user._id, {
      $set: {
        [`views.${date}`]: counter
      }
    }, { upsert: true })
  }
}

export default namespace
