const urlPrefix = require('../config/index').urlPrefix
const backLink = `${urlPrefix}/org-review`
const downloadUrl = process.env.CLAIM_FORM_DOWNLOAD_URL
module.exports = {
  method: 'GET',
  path: `${urlPrefix}/form-download`,
  options: {
    auth: false,
    handler: async (_, h) => {
      return h.view('form-download', { backLink, downloadUrl })
    }
  }
}
