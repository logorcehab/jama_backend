import { UserBillings } from '../../../../models'

async function push({ _id, bill }: { _id: string, bill: any }): Promise<void> {
  const exists = await UserBillings.exists({ _id })
  if (!exists) {
    const newDocument = new UserBillings({ _id, billings: [] })
    await newDocument.save()
  }
  await UserBillings.findByIdAndUpdate(_id, {
    $push: {
      billings: bill
    }
  })
}

export default {
  push
}
