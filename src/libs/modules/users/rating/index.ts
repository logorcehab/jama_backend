import { IUserGuestRating, IUserHostRating } from '../../../../models/user/User'
import { User, UserRating } from '../../../../models'

export async function updateHostRating(uid: string): Promise<void> {
  if (!uid) { throw new Error('User Id is missing!') }
  const user = await User.findById(uid)
  if (!user) { throw new Error('User not found!') }
  const stats: IUserHostRating = {
    competency: 0,
    punctuality: 0,
    vibe: 0,
    venue_signal: 0,
    interaction: 0,
    value: 0,
    final_rate: 0,
    ratingsCounter: 0
  }
  const allRatings = await UserRating.findById(uid)

  const ratingsAsHost = allRatings?.host || []
  const ratingsCount = ratingsAsHost.length

  function calcRating(criteria: string): number {
    const sum = ratingsAsHost
      .map((item: { [x: string]: any }) => item[criteria])
      .reduce((a: number, b: number) => a + b, 0)
    return Number(Number(sum / ratingsCount).toFixed(2) || 0)
  }

  stats.competency = calcRating('competency')
  stats.punctuality = calcRating('punctuality')
  stats.vibe = calcRating('vibe')
  stats.venue_signal = calcRating('venue_signal')
  stats.interaction = calcRating('interaction')
  stats.value = calcRating('value')
  stats.final_rate = calcRating('final_rate')

  stats.ratingsCounter = ratingsCount
  await User.findByIdAndUpdate(uid, {
    host_rating: stats
  }, { upsert: true })
}
export async function updateGuestRating(uid: string): Promise<void> {
  try {
    if (!uid) { throw new Error('User Id is missing!') }
    const user = await User.findById(uid)
    if (!user) { throw new Error('User not found!') }
    const allRatings = await UserRating.findById(uid)
    const ratingsAsGuest = allRatings?.guest || []
    const stats: IUserGuestRating = {
      energy: 0,
      inquisitive: 0,
      punctual: 0,
      respectful: 0,
      final_rate: 0,
      ratingsCounter: 0
    }

    const ratingsCount = ratingsAsGuest.length

    function calcRating(criteria: string): number {
      const sum = ratingsAsGuest
        .map((item: { [x: string]: any }) => item[criteria])
        .reduce((a: number, b: number) => a + b, 0)
      return Number(Number(sum / ratingsCount).toFixed(2) || 0)
    }

    stats.energy = calcRating('energy')
    stats.punctual = calcRating('punctual')
    stats.respectful = calcRating('respectful')
    stats.inquisitive = calcRating('inquisitive')
    stats.final_rate = calcRating('final_rate')

    stats.ratingsCounter = ratingsCount

    await User.findByIdAndUpdate(uid, {
      guest_rating: stats
    })
    return
  } catch (e) {
    console.log(`Update Guest Rating (${uid}) error -> ${Date.now()}`)
    console.log(e)
    throw new Error('Cannot update guest rating!')
  }
}
export async function increaseGuestAttendanceRating(userId: string): Promise<void> {
  if (!userId) {
    throw new Error('Invalid user id!')
  }
  const userData = await User.findById(userId).select('attended_events attendance_rate')
  if (!userData) {
    throw new Error('User not found')
  }
  const attendedEvents = userData.attended_events
  const totalAttended = (attendedEvents || []).length

  const currentRate = userData.attendance_rate

  // Get confirmed attends
  let confirmedAttends = (currentRate * totalAttended) / 100

  // Add 1 event to confirmed attends
  confirmedAttends += 1

  const finalPercentage = (confirmedAttends * 100) / totalAttended
  await User.findByIdAndUpdate(userId, {
    attendance_rate: finalPercentage
  })
}

export default {
  updateHostRating,
  updateGuestRating,
  increaseGuestAttendanceRating
}
