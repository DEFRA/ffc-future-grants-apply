const Joi = require('joi')

// Define config schema
const schema = Joi.object({
  blobStorageConnectionString: Joi.string().when('useBlobStorageConnectionString', {
    is: true,
    then: Joi.required(),
    otherwise: Joi.allow('').optional()
  }),
  blobStorageAccountName: Joi.string().when('useBlobStorageConnectionString', {
    is: true,
    then: Joi.allow('').optional(),
    otherwise: Joi.required()
  }),
  blobStorageContainerName: Joi.string().required(),
  claimFormDownloadUrl: Joi.string().required(),
  useBlobStorageConnectionString: Joi.boolean().default(false)
})

// Build config
const config = {
  blobStorageConnectionString: process.env.BLOB_STORAGE_CONNECTION_STRING,
  blobStorageAccountName: process.env.BLOB_STORAGE_ACCOUNT_NAME,
  blobStorageContainerName: process.env.BLOB_STORAGE_CONTAINER_NAME,
  useBlobStorageConnectionString: process.env.USE_BLOB_STORAGE_CONNECTION_STRING,
  claimFormDownloadUrl: process.env.CLAIM_FORM_DOWNLOAD_URL
}
console.log(config)
// Validate config
const result = schema.validate(config, {
  abortEarly: false
})

// Throw if config is invalid
if (result.error) {
  console.log(process.env.USE_BLOB_STORAGE_CONNECTION_STRING, 'USE CONNECTION STRING')
  throw new Error(
    `The blob storage config is invalid. ${result.error.message}`
  )
}

module.exports = result.value
