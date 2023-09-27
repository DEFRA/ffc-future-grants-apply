const Joi = require('joi')

// Define config schema
const schema = Joi.object({
  connectionStr: Joi.string().when('useConnectionStr', {
    is: true,
    then: Joi.required(),
    otherwise: Joi.allow('').optional()
  }),
  storageAccountName: Joi.string().when('useConnectionStr', {
    is: true,
    then: Joi.allow('').optional(),
    otherwise: Joi.required()
  }),
  containerName: Joi.string().required(),
  useConnectionStr: Joi.boolean().default(false)
})

// Build config
const config = {
  connectionStr:
    'DefaultEndpointsProtocol=httpsAccountName=devffcinfst1001AccountKey=KWCmotG9/1U0r4pxHplFtv0u5C8w2HxCmN+Ooq6eV3HxDOGA/08c/Czk6RlVtqAZYfqvSgU/7DiEhnHTQz/Tng==EndpointSuffix=core.windows.net',
  storageAccountName: 'devffcinfst1001',
  containerName: 'ffc-grants-water-dev',
  useConnectionStr: true
}
console.log(config)
// Validate config
const result = schema.validate(config, {
  abortEarly: false
})

// Throw if config is invalid
if (result.error) {
  throw new Error(
    `The blob storage config is invalid. ${result.error.message}`
  )
}

module.exports = result.value
