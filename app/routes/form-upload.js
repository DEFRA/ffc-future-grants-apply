const { urlPrefix } = require('../config/index')
const { uploadFile, deleteFile } = require('../services/blob-storage')
const { getToken, sendToAvScan } = require('../utils/AvHelperFunctions')
const { v4: uuidv4 } = require('uuid')
const viewTemplate = 'form-upload'
const currentPath = `${urlPrefix}/${viewTemplate}`
const backLink = `${urlPrefix}/form-download`
const {
  fileCheck,
  createErrorsSummaryList
} = require('../utils/uploadHelperFunctions')
const { sendMessage, receiveMessage } = require('../messaging')
const {
  applicationRequestMsgType,
  fileStoreQueueAddress,
  userDataRequestQueueAddress,
  userDataResponseQueueAddress
} = require('../config/messaging')
function createModel (claim, multiForms) {
  return {
    multiForms: { ...multiForms },
    claim: claim,
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
let isProcessing = false
module.exports = [
  {
    method: 'GET',
    path: currentPath,
    options: {
      auth: false
    },
    handler: async (request, h) => {
      const state = request.yar.get('formSubmitted')
      const formSubmitted = state || createModel(null, null)
      const sessionId = uuidv4()
      await sendMessage(
        { sessionId, userId: 8749 },
        applicationRequestMsgType,
        userDataRequestQueueAddress
      )
      const { data } = await receiveMessage(
        sessionId,
        userDataResponseQueueAddress
      )
      formSubmitted.claim = data.claim
      formSubmitted.multiForms = data.multiForms
      if (formSubmitted.errorSummaryList) {
        const allEmpty = formSubmitted.errorSummaryList.every(obj => Object.keys(obj).length === 0)
        formSubmitted.errorSummaryList = allEmpty && []
      }
      console.log('FORM SUBMITTED=====> \n', formSubmitted, '\n')
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
            isProcessing = false
            return h.view(viewTemplate, formSubmitted).takeover()
          }
          formSubmitted = {
            ...formSubmitted,
            errorMessage: { ...formSubmitted.errorMessage, [inputName]: error }
          }
          isProcessing = false
          return h.view(viewTemplate, formSubmitted).takeover()
        }
      }
    },
    handler: async (request, h) => {
      const { action } = request.payload
      const actionPath = action.split('-')
      let formSubmitted = request.yar.get('formSubmitted')
      if (isProcessing) {
        formSubmitted = {
          ...formSubmitted,
          errorMessage: {
            ...formSubmitted.errorMessage,
            [actionPath[1]]: {
              html: 'Please wait for previous file(s) to upload first',
              href: '#' + actionPath[1]
            }
          }
        }
        request.yar.set('formSubmitted', formSubmitted)
        isProcessing = false
        return h.redirect(viewTemplate, formSubmitted)
      }
      if (actionPath[0] === 'delete') {
        isProcessing = true
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
          isProcessing = false
          return h.redirect(viewTemplate, formSubmitted)
        }
        let fileId
        if (actionPath[1] === 'claim') {
          fileId = formSubmitted[actionPath[1]].file_id
        } else {
          const targetFile = formSubmitted.multiForms[actionPath[1]].find(
            (item) => item.file_name === fileName
          )
          fileId = targetFile.file_id
        }
        const isDeleted = await deleteFile(fileName, actionPath[1], fileId)
        if (isDeleted && actionPath[1] === 'claim') {
          formSubmitted = {
            ...formSubmitted,
            errorMessage: {
              ...formSubmitted.errorMessage,
              claimFormErrors: null
            },
            claim: null
          }
          request.yar.set('formSubmitted', formSubmitted)
          isProcessing = false
          return h.redirect(viewTemplate, formSubmitted)
        } else if (isDeleted && actionPath[1] !== 'claim') {
          const filteredArray = formSubmitted.multiForms[actionPath[1]].filter(
            (item) => item.file_name !== fileName
          )
          formSubmitted = {
            ...formSubmitted,
            multiForms: {
              ...formSubmitted.multiForms,
              [actionPath[1]]: filteredArray
            }
          }
          request.yar.set('formSubmitted', formSubmitted)
          isProcessing = false
          return h.redirect(viewTemplate, formSubmitted)
        } else {
          formSubmitted = {
            ...formSubmitted,
            errorMessage: {
              ...formSubmitted.errorMessage,
              claimFormErrors: 'Error deleting file'
            }
          }
          request.yar.set('formSubmitted', formSubmitted)
          isProcessing = false
          return h.redirect(viewTemplate, formSubmitted)
        }
      } else if (actionPath[0] === 'upload') {
        isProcessing = true
        const queueArray = []
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
          isProcessing = false
          return h.redirect(viewTemplate, formSubmitted)
        }
        const newFilesArray = []
        const errorArray = []
        const { token } = await getToken()
        if (token) {
          for (const file of filesArray) {
            const fileCheckDetails = fileCheck(
              file,
              actionPath[1],
              formSubmitted
            )
            if (fileCheckDetails.isCheckPassed) {
              const key = uuidv4()
              const content = Buffer.from(file._data).toString('base64')
              const result = await sendToAvScan(token, {
                key,
                collection: actionPath[1],
                content,
                service: 'fgp',
                extension: fileCheckDetails.file_extension,
                fileName: fileCheckDetails.file_name
              })
              if (result.isScanned && result.isSafe) {
                const fileUploaded = await uploadFile(
                  fileCheckDetails.fileBuffer,
                  fileCheckDetails.file_name,
                  actionPath[1]
                )
                if (fileUploaded.isUploaded) {
                  newFilesArray.push({
                    ...fileCheckDetails,
                    file_id: key,
                    file_size: fileCheckDetails.fileSizeFormatted
                  })
                  queueArray.push({
                    fileId: key,
                    fileName: fileCheckDetails.file_name,
                    fileSize: fileCheckDetails.fileSizeFormatted,
                    fileType: actionPath[1],
                    fileExtension: fileCheckDetails.file_extension,
                    category: 'category test',
                    userId: 8749,
                    bussinessId: 97058,
                    caseId: 65378,
                    grantScheme: 'Grant Scheme test',
                    grantSubScheme: 'Gran sub scheme test',
                    grantTheme: 'Grant theme test',
                    dateAndTime: new Date(),
                    storageUrl: 'Storage URL test'
                  })
                }
              } else if (result.isScanned && !result.isSafe) {
                errorArray.push({
                  html: `${fileCheckDetails.file_name}, can't be uploaded as it's not safe and might have virus`,
                  href: '#' + actionPath[1]
                })
              }
            } else {
              errorArray.push({
                html: fileCheckDetails.html,
                href: '#' + actionPath[1]
              })
            }
          }
          queueArray.length &&
            (await sendMessage(
              {
                method: 'add',
                data: queueArray
              },
              applicationRequestMsgType,
              fileStoreQueueAddress
            ))
        }
        if (newFilesArray.length) {
          if (actionPath[1] === 'claim') {
            formSubmitted = {
              ...formSubmitted,
              claim: newFilesArray[0],
              errorMessage: {
                ...formSubmitted.errorMessage,
                claim: null
              }
            }
          } else {
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
        isProcessing = false
        return h.redirect(viewTemplate, formSubmitted)
      }
    }
  }
]
