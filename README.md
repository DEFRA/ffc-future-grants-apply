# FFC future grants apply

> Web frontend for the future grants apply journey

## Prerequisites

- Access to an instance of an
  [Azure Service Bus](https://docs.microsoft.com/en-us/azure/service-bus-messaging/).
- Access to an instance of an
  [Azure Storage Account](https://docs.microsoft.com/en-us/azure/storage/common/storage-account-overview).
  This could be an actual account or
  [Azurite](https://docs.microsoft.com/en-us/azure/storage/common/storage-use-azurite),
  a storage emulator
- Docker
- Docker Compose

Optional:

- Kubernetes
- Helm

### Environment variables

The following environment variables are required by the application.
Values for development are set in the Docker Compose configuration. Default
values for production-like deployments are set in the Helm chart and may be
overridden by build and release pipelines.

Please ask a developer for an example `.env` file that you can include in the root of your project that will contain environment variables overrirdes for local development that are different than the docker-compose file.

| Name                                        | Description                                                                                      |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| APPLICATION_REQUEST_QUEUE_ADDRESS            | Name of message queue used to send application requests                                          |
| APPLICATION_RESPONSE_QUEUE_ADDRESS           | Name of session enabled message queue used to receive application responses                      |
| MESSAGE_QUEUE_HOST                          | Azure Service Bus hostname, e.g. `myservicebus.servicebus.windows.net`                           |
| MESSAGE_QUEUE_PASSWORD                      | Azure Service Bus SAS policy key                                                                 |
| MESSAGE_QUEUE_SUFFIX                        | Developer initials                                                                               |
| MESSAGE_QUEUE_USER                          | Azure Service Bus SAS policy name, e.g. `RootManageSharedAccessKey`                              |
| NOTIFY_TEMPLATE_ID_FARMER_APPLY_LOGIN       | Id of email template used for future grants apply login email                                    |
| NOTIFY_TEMPLATE_ID_FARMER_CLAIM_LOGIN       | Id of email template used for farmer claim login email                                           |
| NOTIFY_TEMPLATE_ID_VET_LOGIN                | Id of email template used for vet login email                                                    |
| NOTIFY_TEMPLATE_ID_FARMER_REGISTER_INTEREST | Id of email template used for registration of interest                                           |
| AZURE_STORAGE_CREATE_CONTAINERS             | Set true to use connection string, false to connect using azure credentials for blobstorage      |
| DEFRA_ID_TENANT                             | The Azure tenant for Defra Id                                                                    |
| DEFRA_ID_POLICY                             | Defra Id policy                                                                                  |
| DEFRA_ID_REDIRECT_URI                       | Defra Id redirect URI                                                                            |
| DEFRA_ID_JWT_ISSUER_ID                      | Defra Id JWT Issuer id                                                                           |
| DEFRA_ID_CLIENT_ID                          | The application ID assigned to your app during the registration with Defra Id                    |
| DEFRA_ID_CLIENT_SECRET                      | Secret supplied by Defra Id                                                                      |
| DEFRA_ID_SERVICE_ID                         | The unique identifier for your service provided as part of being on-boarded to Defra Id          |
| RPA_HOST_NAME                               | Rural payment agency api endpoint host name                                                      |
| RPA_GET_PERSON_SUMMARY_URL                  | Rural payment agency URL for the get person summary api                                          |
| RPA_GET_ORGANISATION_PERMISSIONS_URL        | Rural payment agency URL for the get organisation permissions api                                |
| RPA_GET_ORGANISATION_URL                    | Rural payment agency URL for the get organisation api                                            |
| APIM_OCP_SUBSCRIPTION_KEY                   | Unique key used to manage auth requests with Azure API management                                |
| APIM_HOST_NAME                              | Azure API management host name                                                                   |
| APIM_OAUTH_PATH                             | Azure API management authorisation endpoint path                                                 |
| APIM_CLIENT_ID                              | Client Id as registered with Azure API management                                                |
| APIM_CLIENT_SECRET                          | Client Secret as registered with Azure API management                                            |
| APIM_SCOPE                                  | Scope of the access token being requested from Azure API management                              |

## Running the application

The application is designed to run in containerised environments, using Docker
Compose in development and Kubernetes in production (a Helm chart is provided
for production deployments to Kubernetes).

Configuration and secret data are held in Azure Key Vault and populated during
the deployment to non-local environments.

_NOTE:_
User data is currently loaded from a file in Azure Storage, an example file is
available ([users.json](./data/users.json)) where the structure of the data can
be seen along with examples. If user record has isTest property set to true and
TEST_TOKEN is valid UUID, then magic link with same token will be generated.

TEST_TOKEN and isTest property should be used for only test environment to enable
automation test.

When running the application locally this file (or one matching the format)
needs to be uploaded to Azurite container that starts with the application. The
storage container the file resides in also needs to be created. The container
name is `users` and the file name is `users.json`.

### Build container image

Container images are built using Docker Compose, with the same images used to
run the service with either Docker Compose or Kubernetes.

When using the Docker Compose files in development the local `app` folder will
be mounted on top of the `app` folder within the Docker container, hiding the
CSS files that were generated during the Docker build. For the site to render
correctly locally `npm run build` must be run on the host system.

By default, the start script will build (or rebuild) images so there will
rarely be a need to build images manually. However, this can be achieved
through the Docker Compose
[build](https://docs.docker.com/compose/reference/build/) command:

```sh
# Build container images
docker-compose build
```

### Start

Use the [start script](./scripts/start) to run the service locally which in
turn uses Docker Compose.

## Test structure

The tests have been structured into subfolders of `./test` as per the
[Microservice test approach and repository structure](https://eaflood.atlassian.net/wiki/spaces/FPS/pages/1845396477/Microservice+test+approach+and+repository+structure)

### Running tests

A convenience script is provided to run automated tests in a containerised
environment. This will rebuild images before running tests via docker-compose,
using a combination of `docker-compose.yaml` and `docker-compose.test.yaml`.
The command given to `docker-compose run` may be customised by passing
arguments to the test script.

Examples:

```sh
# Run all tests
scripts/test

# Run tests with file watch
scripts/test -w
```

## CI pipeline

This service uses the
[FFC CI pipeline](https://github.com/DEFRA/ffc-jenkins-pipeline-library)

#Note: Always make sure to include new parameters in the docker-compose.yaml file before adding to jenkins
