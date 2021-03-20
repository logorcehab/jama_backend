import Mustache from 'mustache'
import fs from 'fs'
import moment from 'moment'

function main(
  { filePath, data }:
    {
      filePath: string
      data: { [key: string]: any }
    }
): string {
  const rendererData = {
    ...data,
    moment: () => (val: any, render: any) => {
      const { date, format } = render(val)
      return moment(date).format(format)
    }
  }
  const source = fs.readFileSync(filePath, { encoding: 'utf-8' })

  const outputString = Mustache.render(source, rendererData)
  return outputString
}

export default main
