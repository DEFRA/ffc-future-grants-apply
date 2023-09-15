require('webdriverio/build/commands/browser/$')
const { expect } = require('chai')
require('constants')
require('dotenv').config({ path: `.env.${process.env.ENV}` })

class CommonActions {
  async open (path) {
    const url = process.env.TEST_ENVIRONMENT_ROOT_URL + path
    await browser.url(url)
  }

  async clickOn (element) {
    const locator = browser.$(element)
    await locator.click()
  }

  async sendKey (element, text) {
    const locator = browser.$(element)
    await locator.setValue(text)
  }

  async elementToContainText (element, text) {
    const locator = await browser.$(element)
    expect(await locator.getText()).to.include(text)
  }

  async elementTextShouldBe (element, text) {
    const locator = await browser.$(element)
    expect(await locator.getText()).to.equal(text)
  }

  async getChildElement(element){
    const locator_list = await browser.$$(element)
    console.log(locator_list)
    return locator_list
     }

  async getPageTitle (expectedTitle) {
    const actualTitle = await browser.getTitle()
    expect(actualTitle).to.be.equal(expectedTitle)
  }

  async urlContain (expectedUrl) {
    const actualUrl = await browser.getUrl()
    expect(actualUrl).to.include(expectedUrl)
  }
  async isElementExist (element) {
    const locator = await browser.$(element)
    return locator.isExisting()
  }

}

module.exports = CommonActions
