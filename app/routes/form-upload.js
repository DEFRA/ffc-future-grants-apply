const { urlPrefix, startPageUrl } = require('../config/index')

const viewTemplate = 'form-upload'
const currentPath = `${urlPrefix}/${viewTemplate}`
const nextPath = startPageUrl
const { uploadFile } = require('../services/blob-storage') // Import your uploadFile function

function createModel (errorMessage) {
  return {
    formActionPage: currentPath,
    // Define multiple upload buttons, each with a unique ID and name
    applicationFormUploadButton: {
      id: 'applicationForm',
      name: 'applicationForm',
      label: 'Upload Application Form (DOC/DOCX)'
    },
    appendixUploadButton: {
      id: 'appendix',
      name: 'appendix',
      label: 'Upload Appendix (XLS/XLSX)'
    },
    errorMessage
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
        maxBytes: 20971520 // Max file size (e.g., 20MB)
      }
    },
    handler: async (request, h) => {
return h.view(viewTemplate, createModel(null))
      
    }
  }
]
