import { User } from '../../../../models'

const namespace = {
  async increment({ userId, amount }: { userId: string, amount: number }): Promise<void> {
    const userData = await User.findById(userId, 'balance')
    if (!userData) {
      throw new Error('User not found')
    }
    const currentHostBalance: number = userData.balance
    const finalHostBalance = Number(currentHostBalance + amount).toFixed(2)

    await User.findByIdAndUpdate(userId, {
      balance: Number(finalHostBalance)
    })
  }
}

export default namespace
