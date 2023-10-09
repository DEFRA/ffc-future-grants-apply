const { Given, When, Then } = require('@wdio/cucumber-framework')
const SelectBusinessPage = require('../pages/select-business-page')
const selectBusinessPage = new SelectBusinessPage()

Given(/^the user is on the (.*) page$/, async function (page) {
  await selectBusinessPage.getHomePage(page)
})
When(/^user start the application$/, async function () {
  await selectBusinessPage.clickOnStartButton()
})
When(/^user login with (.*) business crn and password\(for DefraId\)$/, async function (business) {
  await selectBusinessPage.signInWithDefraId(business)
});
When(/^select the (.*) for application$/, async function (businessName) {
  await selectBusinessPage.clickOnBusiness(businessName)
});
When(/^click on continue button$/, async function () {
  await selectBusinessPage.clickOnContinue()
});
// org-review
When(/^user check the business details$/, async function () {
  await selectBusinessPage.singleUserBusinessDetail()
})
When(/^user confirm the org-review page$/, async function () {
  await selectBusinessPage.checkFarmerDetails()
})
When(/^user agreed the business details is correct$/, async function () {
  await selectBusinessPage.farmerAcceptDetails()
})
Then(/^user continue to next page$/, async function () {
  await selectBusinessPage.proceedWithApplication()
})

