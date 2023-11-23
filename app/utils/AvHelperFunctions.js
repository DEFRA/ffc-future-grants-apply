const axios = require('axios')
const {
  createErrorsSummaryList
} = require('../utils/uploadHelperFunctions')
const { uploadFile } = require('../services/blob-storage')
const tokenUrl = process.env.AV_ACCESS_TOKEN_URL
const clientId = process.env.AV_CLIENT_ID
const clientSecret = process.env.AV_CLIENT_SECRET
const scope = process.env.AV_SCOPE
const grantType = process.env.AV_AUTH_GRANT_TYPE
const avBaseUrl = process.env.AV_BASE_URL

const getTokenFetchOptions = {
  method: 'POST',
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded'
  },
  body: new URLSearchParams({
    grant_type: grantType,
    client_id: clientId,
    client_secret: clientSecret,
    scope
  })
}
async function getToken () {
  try {
    const response = await fetch(tokenUrl, getTokenFetchOptions)
    if (!response.ok) {
      throw new Error(
        `Token Request Failed: ${response.status} ${response.statusText}`
      )
    }
    const token = await response.json()
    const accessToken = `${token.token_type} ${token.access_token}`
    return { token: accessToken, isTokenExist: true }
  } catch (error) {
    console.log('ERROR: ', error)
    throw error
  }
}
async function sendToAvScan (token, fileDetails) {
  const fetchUrl = `${avBaseUrl}syncAv/${fileDetails.collection}/${fileDetails.key}?persistFile=false`
  const headers = {
    Authorization: token
  }
  try {
    console.log('Sending the file for scanning...')
    const response = await axios.put(fetchUrl, fileDetails, { headers })
    if (response && response.status === 200) {
      const { data } = response
      const status = data.split(' ')[1]
      console.log('Scan Result===>', status);
      if (status === 'Clean') {
        return {
          status,
          key: fileDetails.key,
          collection: fileDetails.collection,
          fileName: fileDetails.fileName,
          isSafe: true,
          isScanned: true
        }
      }
      if (status === 'Malicious') {
        return {
          status,
          key: fileDetails.key,
          collection: fileDetails.collection,
          fileName: fileDetails.fileName,
          isSafe: false,
          isScanned: true
        }
      }else{
        throw new Error('Different status message!')
      }
    }
    else{
      throw new Error('Could not get a successful response from the server')
    }
  } catch (error) {
    console.log('Error in sending file to scan: \n', error)
  }
}
async function getScanResult (token, collection, key) {
  const fetchUrl = `${avBaseUrl}files/${collection}/${key}`
  console.log(fetchUrl)
  const getResultFetchOptions = {
    method: 'GET',
    headers: {
      Authorization: token
    }
  }
  try {
    const response = await axios.get(fetchUrl, getResultFetchOptions)
   
    if (response && response.status === 200) {
      const { data } = response
      console.log('data', data);
      const { status, createdOn, modifiedOn, key, collection, fileName } = data
console.log('status=====>\n', status)
      if (status === 'Success') {
        return {
          status,
          createdOn,
          modifiedOn,
          key,
          collection,
          fileName,
          isSafe: true,
          isScanned: true
        }
      } else if (status === 'AwaitingProcessing') {
        return {
          status,
          key,
          collection,
          fileName,
          isSafe: false,
          isScanned: false
        }
      }else if(status === 'FailedToVirusScan'){
        return {
          status,
          key,
          collection,
          fileName,
          isSafe: false,
          isScanned: false,
          errorMessage: 'Faild to scan'
        }
      } else {
        return {
          status,
          createdOn,
          modifiedOn,
          key,
          collection,
          fileName,
          isSafe: false,
          isScanned: true,
          errorMessage: 'Uploaded file is not safe and might have virus'
        }
      }
    }
  } catch (error) {
    console.log('Get Scan Result Error: ', error)
  }
}
async function checkingSingleAvGetResponse (token, collection, key, request, h, formSubmitted, file) {
  return new Promise((resolve) => {
    let counter = -1
    const intervalResult = setInterval(async () => {
      counter += 1;
      console.log('counter===> ', counter);
      try {
        const scannedResult = await getScanResult(
          token,
          collection,
          key
        );
        console.log('SCANNED RESULT=======>\n', scannedResult);

        if (counter > 12) {
          console.log('time out');
          counter = -1;

          const errorsList = createErrorsSummaryList(
            formSubmitted,
            [
              {
                html: 'Request timeout! File cannot be uploaded due to a server error',
                href: `#${collection}`,
              },
            ],
            collection
          );

          formSubmitted.errorSummaryList = errorsList;
          request.yar.set('formSubmitted', formSubmitted);
          clearInterval(intervalResult);
          resolve(h.view('form-upload', formSubmitted));
        }

        if (scannedResult.isScanned && scannedResult.isSafe) {
          clearInterval(intervalResult);
          console.log('scanned successfully!!!!!!');
          counter = -1;

          const fileUploaded = await uploadFile(
            file.fileBuffer,
            file.uploadedFileName,
            collection
          );
          formSubmitted = {
            ...formSubmitted,
            claimForm: {
              fileSize: file.fileSizeFormatted,
              fileName: fileUploaded.originalFileName,
            },
            errorMessage: {
              ...formSubmitted.errorMessage,
              claim: null,
            },
          };

          const errorsList = createErrorsSummaryList(
            formSubmitted,
            null,
            'claim'
          );

          formSubmitted.errorSummaryList = errorsList;
          request.yar.set('formSubmitted', formSubmitted);
          resolve(h.view('form-upload', formSubmitted));
        }
        if(scannedResult.isScanned && !scannedResult.isSafe) {

          clearInterval(intervalResult);
          console.log('scanned but has virus!!!!!!');
          counter = -1;

          formSubmitted = {
            ...formSubmitted,
            errorMessage: {
              ...formSubmitted.errorMessage,
              claim: { html: `${file.uploadedFileName} can't be uploaded as it's not a safe file`, href: '#claim' }
            },
            claimForm: null
          }
          const errorsList = createErrorsSummaryList(
            formSubmitted,
            [{ html: `${file.uploadedFileName} can't be uploaded as it's not a safe file`, href: '#claim' }],
            'claim'
          )
          formSubmitted.errorSummaryList = errorsList
          request.yar.set('formSubmitted', formSubmitted);
          resolve(h.view('form-upload', formSubmitted));
        }
        
      } catch (error) {
        console.error('An error occurred:', error);
        counter = -1;
      }
    }, 5000);
  });
};


module.exports = { getToken, sendToAvScan, getScanResult, checkingSingleAvGetResponse }
