const urlPrefix = require('../config/index').urlPrefix
const backLink = `${urlPrefix}/org-review`

module.exports = {
  method: 'GET',
  path: `${urlPrefix}/form-download`,
  options: {
    auth: false,
    handler: async (_, h) => {
      return h.view('form-download', { backLink })
    }
  }
}
