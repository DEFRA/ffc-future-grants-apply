const { DefaultAzureCredential } = require('@azure/identity')
const { BlobServiceClient } = require('@azure/storage-blob')
const config = require('../config/blob-storage')
let blobServiceClient

if (config.useBlobStorageConnectionString) {
  console.log('Using connection string for BlobServiceClient')
  blobServiceClient = BlobServiceClient.fromConnectionString(
    config.blobStorageConnectionString
  )
} else {
  console.log('Using DefaultAzureCredential for BlobServiceClient')
  const uri = `https://${config.blobStorageAccountName}.blob.core.windows.net`
  blobServiceClient = new BlobServiceClient(uri, new DefaultAzureCredential())
}

const blobContainerClient = blobServiceClient.getContainerClient(
  config.blobStorageContainerName
)

async function uploadFile(buffer, filename) {
  const blockBlobClient = blobContainerClient.getBlockBlobClient(filename)
  await blockBlobClient.upload(buffer, buffer.byteLength)
  console.log('Blob was uploaded successfully')
}

module.exports = { uploadFile }
