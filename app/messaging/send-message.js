const createMessage = require('./create-message')
const { createMessageSender } = require('./create-message-sender')

const sendMessage = async (body, type, config, options) => {
  const message = createMessage(body, type, options)
  console.log(message,'\nconfig=========> \n',config)
  const sender = createMessageSender(config)
  console.log(sender)
  try {
    console.log('\nin try\n')
    await sender.sendMessage(message)
   console.log('successfully sent');
  } catch (error) {
    console.log(error);
  }
 
}

module.exports = sendMessage
