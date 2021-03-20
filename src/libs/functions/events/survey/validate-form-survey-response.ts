import Validator from 'validatorjs'
import { IEventSurveyFormInput } from '../../../../models/event/Event'

function validateFormSurveyResponse(packedForm: string, surveyForm: string): void {
  let receivedForm: string[]
  let survey
  try {
    receivedForm = JSON.parse(surveyForm)
  } catch (e) {
    throw new Error('Could not parse your requisite!')
  }

  if (!Array.isArray(receivedForm)) {
    throw new Error('Expected requisite response array!')
  }

  try {
    survey = JSON.parse(packedForm) as IEventSurveyFormInput[]
  } catch (e) {
    throw new Error('Could not parse the survey form')
  }

  if (survey.length !== receivedForm.length) {
    throw new Error('Invalid requisite form!')
  }
  let error = null
  survey.forEach((input, index) => {
    // Input
    if (input.type === 'input') {
      const validateField = new Validator({ response: receivedForm[index] }, { response: 'string|between:2,500' })
      if (validateField.fails()) {
        error = `Invalid response to question: "${input.question}"`
      }

      // Radio
    } else if (input.type === 'radio') {
      const isValidField = /^(Yes|No)$/.test(receivedForm[index])
      if (!isValidField) {
        error = `Invalid response to question: "${input.question}"`
      }

      // Select
    } else if (input.type === 'select' && input.options) {
      const isValidField = input.options.includes(receivedForm[index])
      if (!isValidField) {
        error = `Invalid response to question: "${input.question}"`
      }
    } else if (input.type === 'date-time') {
      const isValidField = new Validator({ response: receivedForm[index] }, { response: 'numeric' })
      if (!isValidField) {
        error = `Invalid response to question: "${input.question}"`
      }
    }
  })

  if (error) {
    throw new Error(error)
  }
}

export default validateFormSurveyResponse
