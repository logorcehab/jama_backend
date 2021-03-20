function validateSurveyForm(surveyForm: string): void {
  let requisiteForm
  try {
    requisiteForm = JSON.parse(surveyForm)
  } catch (e) {
    throw new Error('Form parser')
  }

  let error
  if (!Array.isArray(requisiteForm)) {
    throw new Error('Form is not an array')
  }
  if (requisiteForm.length === 0) {
    throw new Error('Registration form requires at least 1 field')
  }
  requisiteForm.forEach(input => {
    if (typeof input !== 'object') {
      error = 'Input is not object'
      return
    }
    const keys = Object.keys(input)

    if (input.type === 'select' && keys.length !== 3) {
      error = 'Object does not have 3 props'
      return
    }

    if (input.type !== 'select' && keys.length !== 2) {
      error = 'Object does not have 2 props'
      return
    }

    if (
      keys[0] !== 'type'
      || keys[1] !== 'question'
    ) {
      error = 'Invalid props'
      return
    }

    // Check type
    if (!/^(input|radio|select|date-time)$/.test(input.type)) {
      error = 'Invalid type'
      return
    }

    // Check question
    if (!/^.{3,100}$/.test(input.question)) {
      error = 'Invalid question length'
      return
    }

    // Check select
    if (input.type === 'select') {
      if (
        typeof input.options !== 'object'
        || input.options.length < 2
        || input.options.length > 4
      ) {
        error = 'Invalid select input'
      }
    }
  })

  if (error !== false) {
    throw new Error(error)
  }
}

export default validateSurveyForm
