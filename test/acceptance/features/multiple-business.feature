@smoke
Feature: select multiple business

  Scenario: Apply with valid cred
    Given the user is on the /apply/start page
    When user start the application
    And user login with Multiple business crn and password(for DefraId)

  Scenario Outline: org-review page
    When select the <business> for application
    When click on continue button
    When user check the business details
    And user confirm the org-review page
    And user agreed the business details is correct
    Then user continue to next page
    Examples:
    |business|
    |Small Holding - SBI 106637106 |
