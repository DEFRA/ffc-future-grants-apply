const Joi = require('joi')
const msgTypePrefix = 'uk.gov.ffc.grants'

const mqSchema = Joi.object({
  messageQueue: Joi.object({
    host: Joi.string().required(),
    username: Joi.string(),
    password: Joi.string(),
    useCredentialChain: Joi.bool().default(false),
    appInsights: Joi.object(),
    retries: Joi.number()
  }),
  applicationRequestQueueAddress: Joi.object({
    address: Joi.string().required(),
    type: Joi.string().required().valid('queue')
  }),
  fileStoreQueueAddress: Joi.object({
    address: Joi.string().required(),
    type: Joi.string().required().valid('queue')
  }),
  userDataRequestQueueAddress: Joi.object({
    address: Joi.string().required(),
    type: Joi.string().required().valid('queue')
  }),
  userDataResponseQueueAddress: Joi.object({
    address: Joi.string().required(),
    type: Joi.string().required().valid('sessionQueue')
  }),
  applicationRequestMsgType: Joi.string().required(),
  applicationResponseQueue: Joi.object({
    address: Joi.string().required(),
    type: Joi.string().required().valid('queue')
  }),
  eventQueue: Joi.object({
    address: Joi.string().required(),
    type: Joi.string().required().valid('queue')
  }),
  fetchApplicationRequestMsgType: Joi.string().required(),
  registerYourInterestRequestQueue: Joi.object({
    address: Joi.string().required(),
    type: Joi.string().required().valid('queue'),
    messageType: Joi.string().required()
  })
})
const mqConfig = {
  messageQueue: {
    host: process.env.MESSAGE_QUEUE_HOST,
    username: process.env.MESSAGE_QUEUE_USER,
    password: process.env.MESSAGE_QUEUE_PASSWORD,
    useCredentialChain: process.env.NODE_ENV === 'production',
    appInsights:
      process.env.NODE_ENV === 'production'
        ? require('applicationinsights')
        : undefined,
    retries: 5
  },
  applicationRequestQueueAddress: {
    address: process.env.APPLICATION_REQUEST_QUEUE_ADDRESS,
    type: 'queue'
  },
  userDataRequestQueueAddress: {
    address: process.env.USER_DATA_REQ_QUEUE_ADDRESS,
    type: 'queue'
  },
  userDataResponseQueueAddress: {
    address: process.env.USER_DATA_RES_QUEUE_ADDRESS,
    type: 'sessionQueue'
  },
  fileStoreQueueAddress: {
    address: process.env.FILE_STORE_QUEUE_ADDRESS,
    type: 'queue'
  },
  applicationRequestMsgType: `${msgTypePrefix}.app.request`,

  applicationResponseQueueAddress: {
    address: process.env.APPLICATION_RESPONSE_QUEUE_ADDRESS,
    type: 'queue'
  },
  eventQueue: {
    address: process.env.EVENT_QUEUE_ADDRESS,
    type: 'queue'
  },
  fetchApplicationRequestMsgType: `${msgTypePrefix}.fetch.app.request`,
  registerYourInterestRequestQueue: {
    address: process.env.REGISTER_YOUR_INTEREST_REQUEST_QUEUE_ADDRESS,
    type: 'queue',
    messageType: `${msgTypePrefix}.register.your.interest.request`
  }
}
const mqResult = mqSchema.validate(mqConfig, {
  abortEarly: false
})
console.log('\n \n \n ', mqResult, '\n')
if (mqResult.error) {
  throw new Error(
    `The message queue config is invalid. ${mqResult.error.message}`
  )
}
const applicationRequestQueueAddress = {
  ...mqResult.value.messageQueue,
  ...mqResult.value.applicationRequestQueueAddress
}
const fileStoreQueueAddress = {
  ...mqResult.value.messageQueue,
  ...mqResult.value.fileStoreQueueAddress
}
const applicationResponseQueueAddress = {
  ...mqResult.value.messageQueue,
  ...mqResult.value.applicationResponseQueueAddress
}
const eventQueue = {
  ...mqResult.value.messageQueue,
  ...mqResult.value.eventQueue
}
const fetchApplicationRequestQueue = {
  ...mqResult.value.messageQueue,
  ...mqResult.value.fetchApplicationRequestQueue
}
const applicationRequestMsgType = mqResult.value.applicationRequestMsgType
const registerYourInterestRequestQueue = {
  ...mqResult.value.messageQueue,
  ...mqResult.value.registerYourInterestRequestQueue
}
const userDataRequestQueueAddress = {
  ...mqResult.value.messageQueue,
  ...mqResult.value.userDataRequestQueueAddress
}
const userDataResponseQueueAddress = {
  ...mqResult.value.messageQueue,
  ...mqResult.value.userDataResponseQueueAddress
}
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
