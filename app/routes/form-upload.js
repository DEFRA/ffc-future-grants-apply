const { urlPrefix } = require('../config/index')
const {
  uploadFile,
  deleteFile
} = require('../services/blob-storage') // Import your uploadFile function

const viewTemplate = 'form-upload'
const currentPath = `${urlPrefix}/${viewTemplate}`

function formatFileSize (bytes) {
  const num = Number(bytes)
  console.log(num, typeof num)
  const megabytes = num / (1024 * 1024)
  if (megabytes >= 1) {
    return megabytes.toFixed(2) + ' MB'
  } else {
    const kilobytes = num / 1024
    return kilobytes.toFixed(2) + ' KB'
  }
}
function createModel (errorMessage, isClaimFormUploaded, file) {
  return {
    formActionPage: currentPath,
    claimFormUploadButton: {
      id: 'claimForm',
      name: 'claimForm',
      label: 'Upload Claim Form (DOC/DOCX)'
    },
    errorMessage,
    isClaimFormUploaded,
    file
  }
}

module.exports = [
  {
    method: 'GET',
    path: currentPath,
    options: {
      auth: false
    },
    handler: (request, h) => {
      return h.view(viewTemplate, createModel(null))
    }
  },
  {
    method: 'POST',
    path: currentPath,
    options: {
      auth: false,
      payload: {
        output: 'stream',
        parse: true,
        multipart: true,
        maxBytes: 20971520
      }
    },
    handler: async (request, h) => {
      const { action } = request.payload
      if (action === 'upload') {
        console.log(request.payload)
        try {
          const claimFormFile = request.payload.claimForm
          if (!claimFormFile) {
            return h
              .view(viewTemplate, createModel('No files selected'))
              .takeover()
          }
          if (claimFormFile) {
            const claimFormBuffer = claimFormFile._data
            const claimFormFilename = claimFormFile.hapi.filename
            const fileSizeBytes = claimFormBuffer.byteLength
            const fileSizeFormatted = formatFileSize(fileSizeBytes)
            const fileUploaded = await uploadFile(claimFormBuffer, claimFormFilename)
            console.log(fileUploaded)
            return h.view(
              viewTemplate,
              createModel(null, fileUploaded.isUploaded, {
                originalFileName: fileUploaded.originalFileName,
                fileSize: fileSizeFormatted,
                fileName: fileUploaded.fileName
              })
            )
          }
        } catch (error) {
          console.error('Error uploading file(s):', error)
          return h
            .view(
              viewTemplate,
              createModel('Error uploading file(s)', false, false)
            )
            .takeover()
        }
      }
      if (action === 'delete') {
        const fileName = request.payload.fileName
        if (!fileName) {
          console.log('No file name')
          return h
            .view(viewTemplate, createModel('Invalid file name', false, null))
            .takeover()
        }
        const isDeleted = await deleteFile(fileName)

        if (isDeleted) {
          return h
            .view(
              viewTemplate,
              createModel('File deleted successfully', false, null)
            )
            .takeover()
        } else {
          return h
            .view(viewTemplate, createModel('Error deleting file', true, null))
            .takeover()
        }
      }
    }
  }
]
