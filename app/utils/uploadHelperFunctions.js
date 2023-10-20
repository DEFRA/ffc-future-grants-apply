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
module.exports = { fileCheck }
