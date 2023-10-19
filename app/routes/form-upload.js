const { urlPrefix } = require('../config/index')
const { uploadFile, deleteFile } = require('../services/blob-storage') // Import your uploadFile function
const viewTemplate = 'form-upload'
const currentPath = `${urlPrefix}/${viewTemplate}`
const backLink = `${urlPrefix}/form-download`

function formatFileSize (bytes) {
  const num = Number(bytes)
  const megabytes = num / (1024 * 1024)
  if (megabytes >= 1) {
    return megabytes.toFixed(2) + ' MB'
  } else {
    const kilobytes = num / 1024
    return kilobytes.toFixed(2) + ' KB'
  }
}

function fileCheck (uploadedFile, inputName) {
  let errorObject = {
    text: '',
    fileName: '',
    inputName,
    isCheckPassed: true
  }
  const acceptableExtensions = ['doc', 'docx', 'xls', 'xlsx']
  const uploadedFileName = uploadedFile.hapi.filename
  if (!uploadedFileName || !uploadedFileName.length) {
    return (errorObject = {
      ...errorObject,
      isCheckPassed: false,
      text: 'No file selected. Select a file to upload.'
    })
  }
  errorObject.fileName = uploadedFileName
  const fileExtension = uploadedFileName.split('.').pop()
  const isExtensionAllowed = acceptableExtensions.includes(fileExtension)
  const allowedFileSize = 20000 * 1024
  const claimFormBuffer = uploadedFile._data
  const fileSizeBytes = claimFormBuffer.byteLength

  const isAllowedSize = allowedFileSize >= Number(fileSizeBytes)

  if (!isExtensionAllowed) {
    errorObject = {
      ...errorObject,
      isCheckPassed: false,
      text: `${errorObject.fileName} must be a DOC, DOCX, XLS or XLSX`
    }
  } else if (!isAllowedSize) {
    errorObject = {
      ...errorObject,
      isCheckPassed: false,
      text: `${errorObject.fileName} must be smaller than 20MB`
    }
  } else {
    const fileSizeFormatted = formatFileSize(fileSizeBytes)
    errorObject = {
      ...errorObject,
      isCheckPassed: true,
      fileBuffer: claimFormBuffer,
      fileSizeFormatted,
      uploadedFileName
    }
  }
  return errorObject
}
function createModel (claimForm, multiForms) {
  return {
    multiForms: { ...multiForms },
    claimForm: claimForm,
    formActionPage: currentPath,
    errorMessage: {
      claim: null,
      purchased: null,
      paid: null,
      inPlace: null,
      conditions: null
    },
    backLink
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
      const state = createModel(null, null)
      request.yar.set('state', state)
      return h.view(viewTemplate, state)
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
        maxBytes: 20000000 * 1024,
        failAction: async (request, h, error) => {
          const inputName = request.payload.action.split('-')[1]
          let state = request.yar.get('state')
          if (
            error.output.payload.message.includes(
              'Payload content length greater than maximum '
            )
          ) {
            state = {
              ...state,
              errorMessage: {
                ...state.errorMessage,
                [inputName]: {
                  text: 'The selected file must be smaller than 20MB'
                }
              }
            }
            request.yar.set('state', state)
            return h.view(viewTemplate, state).takeover()
          }
          state = {
            ...state,
            errorMessage: { ...state.errorMessage, [inputName]: error }
          }
          return h.view(viewTemplate, state).takeover()
        }
      }
    },
    handler: async (request, h) => {
      const { action } = request.payload
      const actionPath = action.split('-')
      let state = request.yar.get('state')
      if (actionPath[0] === 'singleUpload') {
        try {
          const claimFormFile = request.payload.claimForm
          const fileCheckDetails = fileCheck(claimFormFile, 'claim')
          if (!fileCheckDetails.isCheckPassed) {
            state = {
              ...state,
              errorMessage: {
                ...state.errorMessage,
                claim: fileCheckDetails
              },
              claimForm: null
            }
            request.yar.set('state', state)
            return h.view(viewTemplate, state).takeover()
          } else {
            const fileUploaded = await uploadFile(
              fileCheckDetails.fileBuffer,
              fileCheckDetails.uploadedFileName
            )

            state = {
              ...state,
              claimForm: {
                originalFileName: fileUploaded.originalFileName,
                fileSize: fileCheckDetails.fileSizeFormatted,
                fileName: fileUploaded.fileName
              },
              errorMessage: {
                ...state.errorMessage,
                claim: null
              }
            }
            request.yar.set('state', state)
            return h.view(viewTemplate, state)
          }
        } catch (error) {
          return h
            .view(
              viewTemplate,
              createModel(
                'The selected file could not be uploaded – try again',
                false,
                null
              )
            )
            .takeover()
        }
      } else if (actionPath[0] === 'delete') {
        const fileName = request.payload.fileName
        if (!fileName || !fileName.length) {
          state = {
            ...state,
            errorMessage: {
              ...state.errorMessage,
              claimFormErrors: 'Invalid file name'
            }
          }
          request.yar.set('state', state)
          return h.view(viewTemplate, state).takeover()
        }
        const isDeleted = await deleteFile(fileName)

        if (isDeleted && actionPath[1] === 'claim') {
          state = {
            ...state,
            errorMessage: { ...state.errorMessage, claimFormErrors: null },
            claimForm: null
          }
          request.yar.set('state', state)
          return h.view(viewTemplate, state)
        } else if (isDeleted && actionPath[1] !== 'claim') {
          const filteredArray = state.multiForms[actionPath[1]].filter(
            (item) => item.uploadedFileName !== fileName
          )

          state = {
            ...state,
            multiForms: { ...state.multiForms, [actionPath[1]]: filteredArray }
          }
          request.yar.set('state', state)
          return h.view(viewTemplate, state)
        } else {
          state = {
            ...state,
            errorMessage: {
              ...state.errorMessage,
              claimFormErrors: 'Error deleting file'
            }
          }
          request.yar.set('state', state)
          return h.view(viewTemplate, state).takeover()
        }
      } else if (actionPath[0] === 'multiUpload') {
        let filesArray = request.payload[actionPath[1]]
        if (!filesArray.length) {
          filesArray = [filesArray]
        }
        const newFilesArray = []
        const errorArray = []
        for (const file of filesArray) {
          const fileCheckDetails = fileCheck(file)
          if (fileCheckDetails.isCheckPassed) {
            const fileUploaded = await uploadFile(
              fileCheckDetails.fileBuffer,
              fileCheckDetails.uploadedFileName
            )
            fileUploaded.isUploaded && newFilesArray.push(fileCheckDetails)
          } else {
            errorArray.push(fileCheckDetails.text)
          }
        }

        if (newFilesArray.length) {
          state = {
            ...state,
            multiForms: { ...state.multiForms, [actionPath[1]]: newFilesArray }
          }
          request.yar.set('state', state)
        } else {
          state = {
            ...state,
            multiForms: { ...state.multiForms, [actionPath[1]]: null }
          }
          request.yar.set('state', state)
        }

        if (errorArray.length) {
          const allFilesErrors = errorArray.join('<br/>')
          state = {
            ...state,
            errorMessage: {
              ...state.errorMessage,
              [actionPath[1]]: { html: allFilesErrors }
            }
          }
        } else {
          state = {
            ...state,
            errorMessage: {
              ...state.errorMessage,
              [actionPath[1]]: null
            }
          }
          request.yar.set('state', state)
        }
        return h.view(viewTemplate, state).takeover()
      }
    }
  }
]
