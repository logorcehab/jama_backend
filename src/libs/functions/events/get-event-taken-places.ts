import { IEvent } from '../../../models/event/Event'

function main(event: IEvent): {
  [key: string]: number | undefined
} {
  const { places_taken} = event

  return {
    places_taken
  }
}

export default main
