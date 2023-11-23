const createMessage = require('./create-message')
const { createMessageSender } = require('./create-message-sender')

const sendMessage = async (body, type, config, options) => {
  const message = createMessage(body, type, options)
  const sender = createMessageSender(config)
  try {
    await sender.sendMessage(message)
    console.log('Queue message successfully sent!')
  } catch (error) {
    console.log(error)
  }
}

module.exports = sendMessage
