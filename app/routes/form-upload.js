const { urlPrefix } = require('../config/index')
const { uploadFile, deleteFile } = require('../services/blob-storage')
const { getToken, sendToAvScan, getScanResult, checkingSingleAvGetResponse } = require('../utils/AvHelperFunctions')
const { v4: uuidv4 } = require('uuid')
const viewTemplate = 'form-upload'
const currentPath = `${urlPrefix}/${viewTemplate}`
const backLink = `${urlPrefix}/form-download`
const {
  fileCheck,
  createErrorsSummaryList
} = require('../utils/uploadHelperFunctions')
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
    backLink,
    errorSummaryList: []
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
      const formSubmitted = createModel(null, null)
      request.yar.set('formSubmitted', formSubmitted)
      return h.view(viewTemplate, formSubmitted)
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
          let formSubmitted = request.yar.get('formSubmitted')
          if (
            error.output.payload.message.includes(
              'Payload content length greater than maximum '
            )
          ) {
            formSubmitted = {
              ...formSubmitted,
              errorMessage: {
                ...formSubmitted.errorMessage,
                [inputName]: {
                  html: 'The selected file must be smaller than 20MB',
                  href: '#' + inputName
                }
              }
            }
            request.yar.set('formSubmitted', formSubmitted)
            return h.view(viewTemplate, formSubmitted).takeover()
          }
          formSubmitted = {
            ...formSubmitted,
            errorMessage: { ...formSubmitted.errorMessage, [inputName]: error }
          }
          return h.view(viewTemplate, formSubmitted).takeover()
        }
      }
    },
    handler: async (request, h) => {
      const { action } = request.payload
      const actionPath = action.split('-')
      let formSubmitted = request.yar.get('formSubmitted')
      if (actionPath[0] === 'singleUpload') {
        try {
          const claimFormFile = request.payload.claimForm
          const fileCheckDetails = fileCheck(claimFormFile, 'claim', formSubmitted)
          if (!fileCheckDetails.isCheckPassed) {
            formSubmitted = {
              ...formSubmitted,
              errorMessage: {
                ...formSubmitted.errorMessage,
                claim: { html: fileCheckDetails.html, href: '#claim' }
              },
              claimForm: null
            }
            const errorsList = createErrorsSummaryList(
              formSubmitted,
              [{ html: fileCheckDetails.html, href: '#claimForm' }],
              'claim'
            )
            formSubmitted.errorSummaryList = errorsList
            request.yar.set('formSubmitted', formSubmitted)
            return h.view(viewTemplate, formSubmitted).takeover()
          } else {
            const { token } = await getToken()

            const key = uuidv4()
            if (token) {
              const fileBlob = new Blob([claimFormFile._data], {
                type: claimFormFile.hapi.headers['content-type']
              })
              const result = await sendToAvScan(
                token,
                'claim',
                fileBlob,
                {
                  key,
                  collection: 'claim',
                  service: 'fgp',
                  extension: fileCheckDetails.fileExtension,
                  fileName: fileCheckDetails.uploadedFileName
                },
                key
              )

              if (result === 204) {
                console.log('File successfully sent!')
                
                return await checkingSingleAvGetResponse(token, 'claim', key, request, h, formSubmitted, fileCheckDetails)
                
              }
            }
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
          formSubmitted = {
            ...formSubmitted,
            errorMessage: {
              ...formSubmitted.errorMessage,
              claimFormErrors: 'Invalid file name'
            }
          }
          request.yar.set('formSubmitted', formSubmitted)
          return h.view(viewTemplate, formSubmitted).takeover()
        }
        const isDeleted = await deleteFile(fileName, actionPath[1])
        if (isDeleted && actionPath[1] === 'claim') {
          formSubmitted = {
            ...formSubmitted,
            errorMessage: { ...formSubmitted.errorMessage, claimFormErrors: null },
            claimForm: null
          }
          request.yar.set('formSubmitted', formSubmitted)
          return h.view(viewTemplate, formSubmitted)
        } else if (isDeleted && actionPath[1] !== 'claim') {
          const filteredArray = formSubmitted.multiForms[actionPath[1]].filter(
            (item) => item.uploadedFileName !== fileName
          )
          formSubmitted = {
            ...formSubmitted,
            multiForms: { ...formSubmitted.multiForms, [actionPath[1]]: filteredArray }
          }
          request.yar.set('formSubmitted', formSubmitted)
          return h.view(viewTemplate, formSubmitted)
        } else {
          formSubmitted = {
            ...formSubmitted,
            errorMessage: {
              ...formSubmitted.errorMessage,
              claimFormErrors: 'Error deleting file'
            }
          }
          request.yar.set('formSubmitted', formSubmitted)
          return h.view(viewTemplate, formSubmitted).takeover()
        }
      } else if (actionPath[0] === 'multiUpload') {
        let filesArray = request.payload[actionPath[1]]
        if (!filesArray.length) {
          filesArray = [filesArray]
        }
        if (filesArray.length > 15) {
          formSubmitted = {
            ...formSubmitted,
            errorMessage: {
              ...formSubmitted.errorMessage,
              [actionPath[1]]: {
                html: 'Uploaded files must be less than 15 files.',
                href: '#' + actionPath[1]
              }
            }
          }
          const errorsList = createErrorsSummaryList(
            formSubmitted,
            [
              {
                href: '#' + actionPath[1],
                html: 'Uploaded files must be less than 15 files.'
              }
            ],
            actionPath[1]
          )
          formSubmitted.errorSummaryList = errorsList
          request.yar.set('formSubmitted', formSubmitted)
          return h.view(viewTemplate, formSubmitted)
        }
        const newFilesArray = []
        const errorArray = []
        const { token } = await getToken()
    
        if (token) {
          const filesToScan = []
          for (const file of filesArray) {
            const fileCheckDetails = fileCheck(file, actionPath[1], formSubmitted)
            if (fileCheckDetails.isCheckPassed) {
              const key = uuidv4()
              const fileBlob = new Blob([file._data], {
                type: file.hapi.headers['content-type']
              })
              const result = await sendToAvScan(
                token,
                actionPath[1],
                fileBlob,
                {
                  key,
                  collection: actionPath[1],
                  service: 'fgp',
                  extension: fileCheckDetails.fileExtension,
                  fileName: fileCheckDetails.uploadedFileName
                },
                key
              )
              console.log("send file status code====> ", result)
              const fileUploaded = await uploadFile(
                fileCheckDetails.fileBuffer,
                fileCheckDetails.uploadedFileName,
                actionPath[1]
              )
              fileUploaded.isUploaded && newFilesArray.push(fileCheckDetails)
            }
            
            
            
       
            else {
              errorArray.push({
                html: fileCheckDetails.html,
                href: '#' + actionPath[1]
              })
            }
          }
          if (newFilesArray.length) {
            formSubmitted = formSubmitted.multiForms[actionPath[1]]
              ? {
                  ...formSubmitted,
                  multiForms: {
                    ...formSubmitted.multiForms,
                    [actionPath[1]]: [
                      ...formSubmitted.multiForms[actionPath[1]],
                      ...newFilesArray
                    ]
                  }
                }
              : {
                  ...formSubmitted,
                  multiForms: {
                    ...formSubmitted.multiForms,
                    [actionPath[1]]: newFilesArray
                  }
                }
          }
  
  
  
  
  
          const allFilesErrors = errorArray
            .map((item) => item.html)
            .join('<br/>')
          formSubmitted = {
            ...formSubmitted,
            errorMessage: {
              ...formSubmitted.errorMessage,
              [actionPath[1]]: allFilesErrors.length
                ? { html: allFilesErrors, href: '#' + actionPath[1] }
                : null
            }
          }
          const errorsSummary = errorArray.length
            ? createErrorsSummaryList(formSubmitted, errorArray, actionPath[1])
            : createErrorsSummaryList(formSubmitted, null, actionPath[1])
          formSubmitted.errorSummaryList = errorsSummary
          request.yar.set('formSubmitted', formSubmitted)
  
  
  
  
  
          return h.view(viewTemplate, formSubmitted)
        }
       
      }
    }
  }
]
