@smoke
Feature: select business

  Scenario: Apply with valid cred
    Given the user is on the /apply/start page
    When user start the application
    And user login with Single business crn and password(for DefraId)

  Scenario: org-review page
    When user check the business details
    And user confirm the org-review page
    And user agreed the business details is correct
    Then user continue to next page
