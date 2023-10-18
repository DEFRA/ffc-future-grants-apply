const Joi = require('joi')

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
function fileCheck (uploadedFile) {
  const acceptableExtensions = [
    'doc',
    'docx',
    'xls',
    'xlsx',
    'pdf',
    'jpg',
    'jpeg',
    'png',
    'mpg',
    'mp4',
    'wmv',
    'mov'
  ]
  const uploadedFileName = uploadedFile.hapi.filename
  const fileExtension = uploadedFileName.split('.').pop()
  const isExtensionAllowed = acceptableExtensions.includes(fileExtension)
  const allowedFileSize = 5000 * 1024
  const claimFormBuffer = uploadedFile._data
  const fileSizeBytes = claimFormBuffer.byteLength

  const isAllowedSize = allowedFileSize >= Number(fileSizeBytes)

  if (!uploadedFileName) {
    return {
      isCheckPassed: false,
      errorMessage: 'No file selected. Select a file to upload.'
    }
  } else if (!isExtensionAllowed) {
    return {
      isCheckPassed: false,
      errorMessage:
        'The selected file must be a DOC, DOCX, XLS, XLSX, PDF, JPG, JPEG, PNG, MPG, MP4, WMV or MOV'
    }
  } else if (!isAllowedSize) {
    return {
      isCheckPassed: false,
      errorMessage: 'The selected file must be smaller than 5MB'
    }
  } else {
    const fileSizeFormatted = formatFileSize(fileSizeBytes)
    return {
      isCheckPassed: true,
      fileBuffer: claimFormBuffer,
      fileSizeFormatted,
      uploadedFileName
    }
  }
}
function createModel (claimForm, multiForms) {
  return {
    multiForms: { ...multiForms },
    claimForm: claimForm,
    formActionPage: currentPath,
    errorMessage: {
      calimFormErrors: null,
      multiFormErrors: null
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
      validate: {
        payload: Joi.object({
          claimForm: Joi.object({
            hapi: Joi.object({
              filename: Joi.string()
                .regex(
                  /\.(doc|docx|xls|xlsx|pdf|jpg|jpeg|png|mpg|mp4|wmv|mov)$/i
                )
                .required()
            }).unknown()
          }).unknown(),
          action: Joi.string(),
          fileName: Joi.string(),
          fileDelete: Joi.object().unknown()
        }).unknown(),
        failAction: async (request, h, error) => {
          if (
            error.output.payload.message.includes('match the required pattern')
          ) {
            return h
              .view(
                viewTemplate,
                createModel(
                  'The selected file must be a DOC, DOCX, XLS, XLSX, PDF, JPG, JPEG, PNG, MPG, MP4, WMV or MOV',
                  false,
                  null
                )
              )
              .takeover()
          } else if (error.output.payload.message.includes('empty')) {
            return h
              .view(
                viewTemplate,
                createModel('No file selected. Select a file to upload.')
              )
              .takeover()
          } else {
            console.log(request.payload)
            return h
              .view(
                viewTemplate,
                createModel(error.output.payload.message, false, null)
              )
              .takeover()
          }
        }
      },

      payload: {
        output: 'stream',
        parse: true,
        multipart: true,
        maxBytes: 5000 * 1024,
        failAction: async (request, h, error) => {
          if (
            error.output.payload.message.includes(
              'Payload content length greater than maximum '
            )
          ) {
            return h
              .view(
                viewTemplate,
                createModel(
                  'The selected file must be smaller than 5MB',
                  false,
                  null
                )
              )
              .takeover()
          }
          return h
            .view(viewTemplate, createModel(error, false, null))
            .takeover()
        }
      }
    },
    handler: async (request, h) => {
      const { action } = request.payload
      const actionPath = action.split('-')
      let state = request.yar.get('state')
      if (action === 'singleUpload') {
        try {
          const claimFormFile = request.payload.claimForm
          const fileCheckDetails = fileCheck(claimFormFile)
          if (fileCheckDetails.errorMessage) {
            state = {
              ...state,
              errorMessage: {
                ...state.errorMessage,
                claimFormErrors: fileCheckDetails.errorMessage
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
      }
      if (actionPath[0] === 'delete') {
        const fileName = request.payload.fileName
        if (!fileName) {
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
            multiForms: { ...state.multiforms, [actionPath[1]]: filteredArray }
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
      }
      if (actionPath[0] === 'multiUpload') {
        const filesArray = request.payload[actionPath[1]]
        const newFilesArray = []
        const errorArray = []
        if (filesArray.length) {
          for (const file of filesArray) {
            const fileCheckDetails = fileCheck(file)
            if (!fileCheckDetails.errorMessage) {
              const fileUploaded = await uploadFile(
                fileCheckDetails.fileBuffer,
                fileCheckDetails.uploadedFileName
              )
              fileUploaded.isUploaded && newFilesArray.push(fileCheckDetails)
            } else {
              errorArray.push(fileCheckDetails.errorMessage)
            }
          }
        } else {
          const fileCheckDetails = fileCheck(filesArray)
          if (!fileCheckDetails.errorMessage) {
            newFilesArray.push(fileCheckDetails)
          } else {
            errorArray.push(fileCheckDetails.errorMessage)
          }
        }
        if (!errorArray.length) {
          state = {
            ...state,
            multiForms: { ...state.multiForms, [actionPath[1]]: newFilesArray }
          }
          request.yar.set('state', state)
          return h.view(viewTemplate, state)
        } else {
          state = {
            ...state,
            errorMessage: {
              ...state.errorMessage,
              multiFormErrors: errorArray
            }
          }
          request.yar.set('state', state)
          return h.view(viewTemplate, state).takeover()
        }
      }
      if (action === 'multiUpload') {
        const filesArray = request.payload.multiFile
        const newArr = []
        for (const file of filesArray) {
          const fileCheckDetails = fileCheck(file)
          newArr.push(fileCheckDetails)
        }
        return h.view(
          viewTemplate,
          createModel(null, false, null, { purchasedForms: newArr })
        )
      }
    }
  }
]
