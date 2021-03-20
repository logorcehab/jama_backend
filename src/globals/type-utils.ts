global.TypeUtils = {
  Object: function Object(input: any) {
    const receivedObject: {
      [key: string]: any
    } = Object(input)
    return {
      hasNestedProperty(nestedProp) {
        const inputObject = receivedObject
        try {
          const propsArray = nestedProp.split('.')
          let current
          for (const prop of propsArray) {
            current = inputObject[prop]
          }
          if (typeof current === 'undefined') return false
        } catch (e) {
          return false
        }

        return true
      }
    }
  }
}
