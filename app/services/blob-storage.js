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

async function uploadFile (buffer, filename,prefix) {
  const fileNameWithPrefix = `${prefix}-${filename}`
  try {
    const blockBlobClient = blobContainerClient.getBlockBlobClient(fileNameWithPrefix)
    await blockBlobClient.upload(buffer, buffer.byteLength)
    console.log('Blob was uploaded successfully')
    return { fileName: fileNameWithPrefix, originalFileName: filename, isUploaded: true }
  } catch (error) {
    console.log(error)
    return { fileName: fileNameWithPrefix, originalFileName: filename, isUploaded: false }
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
async function deleteFile (fileName,prefix) {
  const newFileName=`${prefix}-${fileName}`
  try {
    await blobContainerClient.getBlobClient(newFileName).delete()
    console.log(`Blob '${fileName}' was deleted successfully.`)
    return true
  } catch (error) {
    console.error(`Error deleting blob '${fileName}':`, error)
    return false
  }
}

module.exports = { uploadFile, checkFileExists, deleteFile }
