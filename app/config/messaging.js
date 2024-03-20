const Joi = require('joi')
const msgTypePrefix = 'uk.gov.ffc.grants'

const sharedConfigSchema = {
  host: Joi.string().default('localhost'),
  username: Joi.string(),
  password: Joi.string(),
  appInsights: Joi.object(),
  useCredentialChain: Joi.bool().default(false),
  retries: 5
}
const sharedConfig = {
  host: process.env.MESSAGE_QUEUE_HOST,
  username: process.env.MESSAGE_QUEUE_USER,
  password: process.env.MESSAGE_QUEUE_PASSWORD,
  appInsights:
    process.env.NODE_ENV === 'production'
      ? require('applicationinsights')
      : undefined,
  useCredentialChain: process.env.NODE_ENV === 'production',
  retries: 5
}
const mqSchema = Joi.object({
  applicationRequestQueueAddress: {
    address: Joi.string(),
    type: Joi.string(),
    ...sharedConfigSchema
  },
  fileStoreQueueAddress: {
    address: Joi.string(),
    type: Joi.string(),
    ...sharedConfigSchema
  },
  userDataRequestQueueAddress: {
    address: Joi.string(),
    type: Joi.string(),
    ...sharedConfigSchema
  },
  userDataResponseQueueAddress: {
    address: Joi.string(),
    type: Joi.string(),
    ...sharedConfigSchema
  },
  applicationRequestMsgType: Joi.string(),
  applicationResponseQueueAddress: {
    address: Joi.string(),
    type: Joi.string(),
    ...sharedConfigSchema
  },
  eventQueue: {
    address: Joi.string(),
    type: Joi.string(),
    ...sharedConfigSchema
  },
  fetchApplicationRequestMsgType: Joi.string(),
  registerYourInterestRequestQueue: {
    address: Joi.string(),
    type: Joi.string(),
    messageType: Joi.string()
  }
})
const mqConfig = {
  applicationRequestQueueAddress: {
    address: process.env.APPLICATION_REQUEST_QUEUE_ADDRESS,
    type: 'queue',
    ...sharedConfig
  },
  userDataRequestQueueAddress: {
    address: process.env.USER_DATA_REQ_QUEUE_ADDRESS,
    type: 'queue',
    ...sharedConfig
  },
  userDataResponseQueueAddress: {
    address: process.env.USER_DATA_RES_QUEUE_ADDRESS,
    type: 'sessionQueue',
    ...sharedConfig
  },
  fileStoreQueueAddress: {
    address: process.env.FILE_STORE_QUEUE_ADDRESS,
    type: 'queue',
    ...sharedConfig
  },
  applicationRequestMsgType: `${msgTypePrefix}.app.request`,

  applicationResponseQueueAddress: {
    address: process.env.APPLICATION_RESPONSE_QUEUE_ADDRESS,
    type: 'queue',
    ...sharedConfig
  },
  eventQueue: {
    address: process.env.EVENT_QUEUE_ADDRESS,
    type: 'queue',
    ...sharedConfig
  },
  fetchApplicationRequestMsgType: `${msgTypePrefix}.fetch.app.request`,
  registerYourInterestRequestQueue: {
    address: process.env.REGISTER_YOUR_INTEREST_REQUEST_QUEUE_ADDRESS,
    type: 'queue',
    messageType: `${msgTypePrefix}.register.your.interest.request`
  }
}
const { value, error } = mqSchema.validate(mqConfig, {
  abortEarly: false
})
if (error) {
  throw new Error(
    `The message queue config is invalid. ${error.message}`
  )
}
const {
  applicationRequestQueueAddress,
  applicationResponseQueueAddress,
  eventQueue,
  fetchApplicationRequestQueue,
  applicationRequestMsgType,
  registerYourInterestRequestQueue,
  fileStoreQueueAddress,
  userDataRequestQueueAddress,
  userDataResponseQueueAddress
} = value
module.exports = {
  applicationRequestQueueAddress,
  applicationResponseQueueAddress,
  eventQueue,
  fetchApplicationRequestQueue,
  applicationRequestMsgType,
  registerYourInterestRequestQueue,
  fileStoreQueueAddress,
  userDataRequestQueueAddress,
  userDataResponseQueueAddress,
  mqConfig
}
