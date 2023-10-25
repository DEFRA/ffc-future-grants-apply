let errorObject = {
  text: '',
  fileName: '',
  inputName: '',
  isCheckPassed: true
}

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
function createErrorsSummaryList (state, errorArray, actionPath) {
  const createErrorsSummary = {
    ...state.errorMessage,
    [actionPath]: errorArray
  }

  const errorsSummary = Object.values(createErrorsSummary)
    .flatMap((item) => {
      if (item && item[0]) {
        return {
          text: item[0].html ? item[0].html : item[0].text,
          href: item[0].href
        }
      } else if (item && item.href) {
        return {
          text: item.html ? item.html : item.text,
          href: item.href
        }
      }
      return undefined
    })
    .filter((item) => item !== undefined)
  return errorsSummary
}
function fileCheck (uploadedFile, inputName) {
  const acceptableExtensions =
    inputName === 'claim'
      ? ['doc', 'docx', 'xls', 'xlsx']
      : [
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
  errorObject.fileName = uploadedFileName
  const fileExtension = uploadedFileName.split('.').pop()
  const isExtensionAllowed = acceptableExtensions.includes(fileExtension)
  const allowedFileSize = 20000 * 1024
  const claimFormBuffer = uploadedFile._data
  const fileSizeBytes = claimFormBuffer.byteLength
  const isAllowedSize = allowedFileSize >= Number(fileSizeBytes)

  if (!uploadedFileName || !uploadedFileName.length) {
    return (errorObject = {
      ...errorObject,
      inputName,
      isCheckPassed: false,
      text: 'No file selected. Select a file to upload.'
    })
  }

  if (!isExtensionAllowed) {
    errorObject = {
      ...errorObject,
      isCheckPassed: false,
      text:
        inputName === 'claim'
          ? `${errorObject.fileName} must be a DOC, DOCX, XLS, XLSX`
          : `${errorObject.fileName} must be a DOC, DOCX, XLS, XLSX, PDF, JPG, JPEG, PNG, MPG, MP4, WMV, MOV`
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
module.exports = { fileCheck, createErrorsSummaryList }
