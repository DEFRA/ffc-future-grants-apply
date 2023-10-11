const Joi = require('joi')

const { urlPrefix } = require('../config/index')
const { uploadFile, deleteFile } = require('../services/blob-storage') // Import your uploadFile function
const viewTemplate = 'form-upload'
const currentPath = `${urlPrefix}/${viewTemplate}`

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
function fileCheck (claimFormFile) {
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
  const claimFormFilename = claimFormFile.hapi.filename
  const fileExtension = claimFormFilename.split('.').pop()
  const isExtensionAllowed = acceptableExtensions.includes(fileExtension)
  const allowedFileSize = 5000 * 1024
  const claimFormBuffer = claimFormFile._data
  const fileSizeBytes = claimFormBuffer.byteLength

  const isAllowedSize = allowedFileSize >= Number(fileSizeBytes)
  console.log(isAllowedSize)
  if (!claimFormFilename) {
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
      claimFormFilename
    }
  }
}
function createModel (errorMessage, isClaimFormUploaded, claimForm,multiFilesState) {
  return {
    state:{
      multiFilesState:{...multiFilesState},
      isClaimFormUploaded,
      claimForm:claimForm
    },
    formActionPage: currentPath,
    errorMessage,
   
  };
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
        console.log(request.payload);  
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
   
      if (action === 'singleUpload') {
        try {
          const claimFormFile = request.payload.claimForm
          const fileCheckDetails = fileCheck(claimFormFile)
          if (fileCheckDetails.errorMessage) {
            return h
              .view(
                viewTemplate,
                createModel(fileCheckDetails.errorMessage,false,null,null)
              )
              .takeover()
          } else {
            const fileUploaded = await uploadFile(
              fileCheckDetails.fileBuffer,
              fileCheckDetails.claimFormFilename
            )
            return h.view(
              viewTemplate,
              createModel(null, fileUploaded.isUploaded,{
                originalFileName: fileUploaded.originalFileName,
                fileSize: fileCheckDetails.fileSizeFormatted,
                fileName: fileUploaded.fileName
              },null)
            )
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
      if (action === 'singleDelete') {
        const fileName = request.payload.fileName
        if (!fileName) {
          return h
            .view(viewTemplate, createModel('Invalid file name', false, null))
            .takeover()
        }
        const isDeleted = await deleteFile(fileName)

        if (isDeleted) {
          return h
            .view(viewTemplate, createModel(null, false, null))
            .takeover()
        } else {
          return h
            .view(viewTemplate, createModel('Error deleting file', true, null))
            .takeover()
        }
      } 
       if(action==='multiUpload'){
      const test=request.payload.state.multiFilesState
      console.log({...test})
   
   
      
       
        const filesArray = request.payload.multiFile
        const newArr=[]
        for (const file of filesArray) {
          const fileCheckDetails = fileCheck(file)
          newArr.push(fileCheckDetails)
        }      
        return h.view(
          viewTemplate,
          createModel(null,false,null,{purchasedForms:newArr})
        )
   
      }
    }
  }
]
