const { DefaultAzureCredential } = require('@azure/identity')
const { BlobServiceClient } = require('@azure/storage-blob')
// const { v4: uuidv4 } = require('uuid')

const config = require('../config/blob-storage')
let blobServiceClient

if (config.useBlobStorageConnectionString) {
  console.log('Using connection string for BlobServiceClient', config.blobStorageConnectionString)
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

async function uploadFile (buffer, filename) {
  const filenameWithUuid = filename
  try {
    // const uuid = uuidv4()
    const blockBlobClient = blobContainerClient.getBlockBlobClient(filenameWithUuid)
    await blockBlobClient.upload(buffer, buffer.byteLength)
    console.log('Blob was uploaded successfully')
    return { fileName: filenameWithUuid, originalFileName: filename, isUploaded: true }
  } catch (error) {
    console.log(error)
    return { fileName: filenameWithUuid, originalFileName: filename, isUploaded: false }
  }
}
async function checkFileExists (fileName) {
  try {
    const blobClient = blobContainerClient.getBlobClient(fileName)
    await blobClient.getProperties()
    return true
  } catch (error) {
    if (error.statusCode === 404) {
      return false
    }
    throw error
  }
}
async function deleteFile (fileName) {
  console.log(fileName)
  try {
    await blobContainerClient.getBlobClient(fileName).delete()
    console.log(`Blob '${fileName}' was deleted successfully.`)
    return true
  } catch (error) {
    console.error(`Error deleting blob '${fileName}':`, error)
    return false
  }
}

module.exports = { uploadFile, checkFileExists, deleteFile }
