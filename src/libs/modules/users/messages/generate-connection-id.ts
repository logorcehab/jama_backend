import { v4 as uuidv4 } from 'uuid'
import { UserConnection } from '../../../../models'

async function main(): Promise<string> {
  let id = ''
  let taken = true
  while (taken === true) {
    id = uuidv4()
    const found = await UserConnection.findById(id)
    if (!found) taken = false
  }
  return id
}

export default main
