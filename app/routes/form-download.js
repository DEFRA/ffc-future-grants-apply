const Joi = require('joi')
const { whichReview } = require('../session/keys').farmerApplyData
const { speciesRadios } = require('./models/form-component/species-radio')
const session = require('../session')
const urlPrefix = require('../config/index').urlPrefix

const legendText = 'Download Application Form?'
const errorText = 'Select the livestock type you want reviewed'
const hintHtml = `<p>You can have one review every 10 months for one type of livestock.</p>
<p>If you’re eligible for more than one type of livestock, you must choose which one you want reviewed.</p>`
const backLink = `${urlPrefix}/org-review`

module.exports = [
  {
    method: 'GET',
    path: `${urlPrefix}/form-download`,
    options: {
      handler: async (request, h) => {
        return h.view('form-download', {
          backLink
        })
      }
    }
  },
  {
    method: 'POST',
    path: `${urlPrefix}/form-download`,
    options: {
      validate: {
        payload: Joi.object({
        }),
        failAction: (request, h, _err) => {
          return h.view('form-download', {
            backLink
          }).code(400).takeover()
        }
      },
      handler: async (request, h) => {
        session.setFarmerApplyData(request, whichReview, request.payload[whichReview])
        return h.redirect(`${urlPrefix}/${request.payload[whichReview]}-eligibility`)
      }
    }
  }
]
