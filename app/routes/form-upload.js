const Joi = require('joi');

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
function fileCheck(claimFormFile){
  const acceptableExtensions=["doc", "docx","xls", "xlsx","pdf","jpg", "jpeg", "png","mpg", "mp4", "wmv", "mov"]
 const claimFormFilename= claimFormFile.hapi.filename
 const fileExtension=claimFormFilename.split('.').pop();
 const isExtensionAllowed= acceptableExtensions.includes(fileExtension);
  const allowedFileSize=5000 * 1024;
  const claimFormBuffer = claimFormFile._data
  const fileSizeBytes = claimFormBuffer.byteLength
  const isAllowedSize=allowedFileSize>= Number(fileSizeBytes)
 if(!claimFormFilename){
  return {isCheckPassed:false,errorMessage:"No file selected. Select a file to upload."}
 }else if(!isExtensionAllowed){
  return {isCheckPassed:false,errorMessage:"The selected file must be a DOC, DOCX, XLS, XLSX, PDF, JPG, JPEG, PNG, MPG, MP4, WMV or MOV"}
} else if(!isAllowedSize){
    return {isCheckPassed:false,errorMessage:"The selected file must be smaller than 5MB"}
  } 
  else{
    const fileSizeFormatted = formatFileSize(fileSizeBytes);
    return {isCheckPassed:true,fileBuffer:claimFormBuffer,fileSizeFormatted,claimFormFilename}
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
      validate:{
        payload:Joi.object({
          claimForm:Joi.object({
            hapi:Joi.object({
              filename:Joi.string().regex(/\.(doc|docx|xls|xlsx|pdf|jpg|jpeg|png|mpg|mp4|wmv|mov)$/i).required()
            }).unknown()
          }).unknown(),
          action:Joi.string(),
          fileName:Joi.string(),
          fileDelete:Joi.object().unknown()
        }),
        failAction:"ignore"
      },
      
      payload: {
       
        output: 'stream',
        parse: true,
        multipart: true,
        maxBytes: 1073741824,
        timeout:false,
        failAction: (request, h, error) => {
          console.log("ERROR====>>> ",error)
          const errorMessage = 'Invalid input: ' + error.output.payload.mesage;
          return h.view(viewTemplate, createModel(errorMessage, false)).takeover();
        },
      },
     
    },
    handler: async (request, h) => {
      const { action } = request.payload
      if (action === 'upload') {
        try {
          const claimFormFile = request.payload.claimForm
            const fileCheckDetails=fileCheck(claimFormFile);
            if(fileCheckDetails.errorMessage){
              return h
              .view(viewTemplate, createModel(fileCheckDetails.errorMessage,false))
              .takeover()
            }else{
              const fileUploaded = await uploadFile(fileCheckDetails.fileBuffer, fileCheckDetails.claimFormFilename)
              return h.view(
                viewTemplate,
                createModel(null, fileUploaded.isUploaded, {
                  originalFileName: fileUploaded.originalFileName,
                  fileSize:fileCheckDetails.fileSizeFormatted,
                  fileName: fileUploaded.fileName
                })
              )
            }
        } catch (error) {
          console.error('The selected file could not be uploaded – try again',error)
          return h
            .view(
              viewTemplate,
              createModel('The selected file could not be uploaded – try again', false, null)
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
              createModel(null, false, null)
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


// {
//   method: 'POST',
//   path: `${urlPrefix}/which-review`,
//   options: {
//     validate: {
//       payload: Joi.object({
//         [whichReview]: Joi.string().valid('sheep', 'pigs', 'dairy', 'beef').required()
//       }),
//       failAction: (request, h, _err) => {
//         return h.view('which-review', {
//           ...speciesRadios(legendText, whichReview, session.getFarmerApplyData(request, whichReview), errorText, radioOptions),
//           backLink
//         }).code(400).takeover()
//       }
//     },
//     handler: async (request, h) => {
//       session.setFarmerApplyData(request, whichReview, request.payload[whichReview])
//       return h.redirect(`${urlPrefix}/${request.payload[whichReview]}-eligibility`)
//     }