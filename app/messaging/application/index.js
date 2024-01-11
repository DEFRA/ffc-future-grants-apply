const { sendMessage, receiveMessage } = require('../')
const { applicationRequestQueueAddress, applicationRequestMsgType, fetchApplicationRequestMsgType, applicationResponseQueueAddress } = require('../../config/index').mqConfig
async function getApplication (applicationReference, sessionId) {
  await sendMessage({ applicationReference }, fetchApplicationRequestMsgType, applicationRequestQueueAddress, { sessionId })
  return receiveMessage(sessionId, applicationResponseQueueAddress)
}

async function sendApplication (application, sessionId) {
  console.log(`Sending application ${JSON.stringify(application)} to queue ${applicationRequestQueueAddress.address} with sessionID ${sessionId}.`)
  await sendMessage(
    application,
    applicationRequestMsgType,
    applicationRequestQueueAddress,
    { sessionId }
  )
  const response = await receiveMessage(
    sessionId,
    applicationResponseQueueAddress
  )
  console.log(`Received response ${JSON.stringify(response)} from queue ${applicationResponseQueueAddress.address} for sessionID ${sessionId}.`)
  return response?.applicationReference
}

module.exports = {
  getApplication,
  sendApplication
}
