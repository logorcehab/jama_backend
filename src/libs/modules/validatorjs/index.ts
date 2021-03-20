import Validatorjs from 'validatorjs'

Validatorjs.register('age', val => /[12]\d{3}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])/.test(val as string), 'Expected date format: YYYY-MM-DD!')

Validatorjs.register('phone', val => /\+(9[976]\d|8[987530]\d|6[987]\d|5[90]\d|42\d|3[875]\d|2[98654321]\d|9[8543210]|8[6421]|6[6543210]|5[87654321]|4[987654310]|3[9643210]|2[70]|7|1)\d{1,14}$/.test(val as string), 'Invalid phone number')

Validatorjs.register('url-facebook', val => /^https:\/\/(www.)?facebook\.com\/.{1,}$/.test(val as string), 'Invalid facebook url')

Validatorjs.register('url-instargram', val => /^https:\/\/(www.)?instagram\.com\/.{1,}$/.test(val as string), 'Invalid instagram url')

Validatorjs.register('url-linkedin', val => /^https:\/\/(www.)?linkedin\.com\/.{1,}$/.test(val as string), 'Invalid linkedin url')

Validatorjs.register('url-twitter', val => /^https:\/\/(www.)?twitter\.com\/.{1,}$/.test(val as string), 'Invalid twitter url')

Validatorjs.register('url', val => /^(http(s)?:\/\/.)?(www\.)?[-a-zA-Z0-9@:%._+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_+.~#?&//=]*)$/.test(val as string), 'Invalid url')

Validatorjs.register('arrayMinOneElement', val => (Array.isArray(val) ? val.length > 0 : false), 'Invalid array length')

export default Validatorjs
