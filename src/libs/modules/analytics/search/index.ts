import { UserAnalytics } from '../../../../models'

async function save(term: string, userId: string): Promise<void> {
  /**
   * @async
   * @param {string} term - searched term
   * @param {string} userId
   */
  // Store only lower case query
  if (!term) {
    throw new Error('Expected term!')
  }
  const valid = term.match(/^[a-zA-Z0-9 !@#\$%\^\&*)\(+=._-]+$/g)
  if (!valid) {
    throw new Error('Invalid term!')
  }
  const searched = term.toString().toLowerCase()
  if (searched.length > 100) {
    throw new Error('Your term is too long!')
  }

  const searchObj = {
    value: term,
    timestamp: Date.now()
  }

  if (userId) {
    await UserAnalytics.findByIdAndUpdate(userId, {
      $push: {
        searches: searchObj
      }
    })
  }
}

export { save }
