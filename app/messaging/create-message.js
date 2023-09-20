const createMessage = (body, type, options) => {
  return {
    body,
    type,
    source: 'ffc-future-grants-apply',
    ...options
  }
}

module.exports = createMessage
