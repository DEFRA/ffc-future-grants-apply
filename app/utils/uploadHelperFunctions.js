const ExcelJS = require('exceljs');

let errorObject = {
  html: '',
  file_name: '',
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
function createErrorsSummaryList (formSubmitted, errorArray, actionPath) {
  const createErrorsSummary = {
    ...formSubmitted.errorMessage,
    [actionPath]: errorArray
  }
  const errorsSummary = Object.values(createErrorsSummary)
    .flatMap((item) => {
      if (item && item.length) {
        const filesArray = []
        for (const file of item) {
          filesArray.push({
            html: file.html ? file.html : file.text,
            href: file.href
          })
        }
        return filesArray.flat(1)
      } else if (item && item.href) {
        return {
          html: item.html ? item.html : item.text,
          href: item.href
        }
      }
      return undefined
    })
    .filter((item) => item !== undefined)
  return errorsSummary
}
function fileCheck (uploadedFile, inputName, state) {
  console.log(uploadedFile, inputName, state)
  const fileNames =
    state.multiForms[`${inputName}`] &&
    state.multiForms[`${inputName}`].map((item) => item.file_name)

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

  const fileName = uploadedFile.hapi.filename
  const isFileExist = fileNames ? fileNames.includes(fileName) : false
  errorObject.file_name = fileName
  const fileExtension = fileName.split('.').pop()
  const isExtensionAllowed = acceptableExtensions.includes(fileExtension)
  const allowedFileSize = 17000 * 1024
  const claimFormBuffer = uploadedFile._data
  const fileSizeBytes = claimFormBuffer.byteLength
  const isAllowedSize = allowedFileSize >= Number(fileSizeBytes)
  if (!fileName || !fileName.length) {
    return (errorObject = {
      ...errorObject,
      inputName,
      isCheckPassed: false,
      html: 'No file selected. Select a file to upload.'
    })
  }
  if (isFileExist) {
    errorObject = {
      ...errorObject,
      isCheckPassed: false,
      html: `${errorObject.file_name} is already uploaded`
    }
  } else if (!isExtensionAllowed) {
    errorObject = {
      ...errorObject,
      isCheckPassed: false,
      html:
        inputName === 'claim'
          ? `${errorObject.file_name} must be a DOC, DOCX, XLS, XLSX`
          : `${errorObject.file_name} must be a DOC, DOCX, XLS, XLSX, PDF, JPG, JPEG, PNG, MPG, MP4, WMV, MOV`
    }
  } else if (!isAllowedSize) {
    errorObject = {
      ...errorObject,
      isCheckPassed: false,
      html: `${errorObject.file_name} must be smaller than 20MB`
    }
  } else {
    const fileSizeFormatted = formatFileSize(fileSizeBytes)
    errorObject = {
      ...errorObject,
      isCheckPassed: true,
      fileBuffer: claimFormBuffer,
      file_extension: fileExtension,
      fileSizeFormatted,
      file_name: fileName
    }
  }
  return errorObject
}

async function extractDataToJson (fileBuffer) {
  const workBook = new ExcelJS.Workbook()
  await workBook.xlsx.load(fileBuffer)
  const data = []
  workBook.eachSheet(sheet => {
    const sheetData = []
    sheet.eachRow(row => {
      sheetData.push(row.values)
    })
    data.push({
      sheetName: sheet.name,
      data: sheetData
    })
  })
    return data

}
module.exports = { fileCheck, createErrorsSummaryList, extractDataToJson }
