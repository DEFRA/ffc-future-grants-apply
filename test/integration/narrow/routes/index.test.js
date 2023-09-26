const cheerio = require('cheerio')
const expectPhaseBanner = require('../../../utils/phase-banner-expect')

describe('future grants apply home page test', () => {
  test('GET / route returns 200 when not logged in', async () => {
    const options = {
      method: 'GET',
      url: '/apply/start'
    }

    const res = await global.__SERVER__.inject(options)

    expect(res.statusCode).toBe(200)
    const $ = cheerio.load(res.payload)
    expect($('.govuk-heading-l').text()).toEqual(
      'Apply for a farming grant'
    )
    const button = $('.govuk-main-wrapper .govuk-button')
    expect(button.text()).toMatch('Start now')
    expect($('title').text()).toEqual('Annual health and welfare review of livestock')
    expectPhaseBanner.ok($)
  })
})
