const Joi = require('joi')

const msgTypePrefix = 'uk.gov.ffc.grants'

const mqSchema = Joi.object({
  messageQueue: {
    host: Joi.string().required(),
    username: Joi.string(),
    password: Joi.string(),
    useCredentialChain: Joi.bool().default(false),
    appInsights: Joi.object(),
    retries: Joi.number()
  },
  applicationRequestQueue: {
    address: process.env.APPLICATION_REQUEST_QUEUE_ADDRESS,
    type: 'queue'
  },
  fileStoreQueueAddress: {
    address: process.env.FILE_STORE_QUEUE_ADDRESS,
    type: 'queue'
  },
  userDataRequestQueueAddress: {
    address: process.env.USER_DATA_REQUEST_QUEUE_ADDRESS,
    type: 'queue'
  },
  userDataResponseQueueAddress: {
    address: process.env.USER_DATA_RESPONSE_QUEUE_ADDRESS,
    type: 'sessionQueue'
  },
  applicationRequestMsgType: `${msgTypePrefix}.app.request`,
  applicationResponseQueue: {
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
  applicationRequestQueue: {
    address: process.env.APPLICATION_REQUEST_QUEUE_ADDRESS,
    type: 'queue'
  },
  userDataRequestQueueAddress: {
    address: process.env.USER_DATA_REQUEST_QUEUE_ADDRESS,
    type: 'queue'
  },
  userDataResponseQueueAddress: {
    address: process.env.USER_DATA_RESPONSE_QUEUE_ADDRESS,
    type: 'sessionQueue'
  },
  fileStoreQueueAddress: {
    address: process.env.FILE_STORE_QUEUE_ADDRESS,
    type: 'queue'
  },
  applicationRequestMsgType: `${msgTypePrefix}.app.request`,

  applicationResponseQueue: {
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
if (mqResult.error) {
  throw new Error(
    `The message queue config is invalid. ${mqResult.error.message}`
  )
}

const applicationRequestQueue = {
  ...mqResult.value.messageQueue,
  ...mqResult.value.applicationRequestQueue
}
const fileStoreQueueAddress = {
  ...mqResult.value.messageQueue,
  ...mqResult.value.fileStoreQueueAddress
}
const applicationResponseQueue = {
  ...mqResult.value.messageQueue,
  ...mqResult.value.applicationResponseQueue
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
  applicationRequestQueue,
  applicationResponseQueue,
  eventQueue,
  fetchApplicationRequestQueue,
  applicationRequestMsgType,
  registerYourInterestRequestQueue,
  fileStoreQueueAddress,
  userDataRequestQueueAddress,
  userDataResponseQueueAddress
}
