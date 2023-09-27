const urlPrefix = require('../config/index').urlPrefix

module.exports = {
  method: 'GET',
  path: `${urlPrefix}/upload-files`,
  options: {
    auth: false,
    handler: async (_, h) => {
      return h.view('form-upload')
    }
  }
}
