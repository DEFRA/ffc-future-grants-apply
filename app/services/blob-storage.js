const { DefaultAzureCredential } = require('@azure/identity')
const { BlobServiceClient } = require('@azure/storage-blob')
const stream = require('stream')
const config = require('../config/blob-storage')
const { sendMessage } = require('../messaging')
const { applicationRequestMsgType, applicationRequestQueue } = require('../config/messaging')
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
async function uploadFile (buffer, filename, prefix) {
  const fileNameWithPrefix = `${prefix}-${filename}`
  const chunkSize = 0.25 * 1024 * 1024
  const totalBytes = buffer.byteLength
  let uploadedBytes = 0
  const onChunkProgress = (chunkSize) => {
    uploadedBytes += chunkSize
    const progress = (uploadedBytes / totalBytes) * 100
    return Number(progress.toFixed(2).split('.')[0])
  }
  try {
    const blockBlobClient = blobContainerClient.getBlockBlobClient(fileNameWithPrefix)
    for (let offset = 0; offset < buffer.byteLength; offset += chunkSize) {
      const chunk = buffer.slice(offset, offset + chunkSize)
      const readableStream = new stream.Readable({
        read () {
          this.push(chunk)
          this.push(null)
        }
      })
      await blockBlobClient.uploadStream(
        readableStream,
        chunk.byteLength,
        undefined,
        {
          onProgress: (ev) => {
            onChunkProgress(ev.loadedBytes)
          }
        }
      )
    }
    console.log('Blob was uploaded successfully')
    await sendMessage({ sessionId: filename }, applicationRequestMsgType, applicationRequestQueue)
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
async function deleteFile (fileName, prefix) {
  const newFileName = `${prefix}-${fileName}`
  try {
    await blobContainerClient.getBlobClient(newFileName).delete()
    console.log(`Blob '${fileName}' was deleted successfully.`)
    await sendMessage({ name: newFileName }, applicationRequestMsgType, applicationRequestQueue)
    return true
  } catch (error) {
    console.error(`Error deleting blob '${fileName}':`, error)
    return false
  }
}

module.exports = { uploadFile, checkFileExists, deleteFile }
