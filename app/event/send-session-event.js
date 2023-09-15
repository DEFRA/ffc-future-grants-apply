const raiseEvent = require('./raise-event')

const sendSessionEvent = (organisation, sessionId, entryKey, key, value, ip) => {
  if (sessionId && organisation) {
    const event = {
      id: sessionId,
      sbi: organisation.sbi,
      cph: 'n/a',
      email: organisation.email,
      name: 'send-session-event',
      type: `${entryKey}-${key}`,
      message: `Session set for ${entryKey} and ${key}.`,
      data: { [key]: value },
      ip
    }
    raiseEvent(event)
  }
}

module.exports = sendSessionEvent
