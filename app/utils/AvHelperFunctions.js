const axios = require('axios')

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
    return { token, isTokenExist: true }
  } catch (error) {
    console.log('ERROR: ', error)
    throw error
  }
}
async function sendToAvScan (token, collection, file, fileDetails, key) {
  const formData = new FormData()
  formData.append('fileDetails', JSON.stringify(fileDetails))
  formData.append('file', file)
  const fetchUrl = `${avBaseUrl}files/stream/${collection}/${key}`
  const headers = {
    Authorization: token
  }
  try {
    console.log('Sending the file for scanning...')
    const response = await axios.put(fetchUrl, formData, { headers })
    return response.status
  } catch (error) {
    console.log('Error in sending file to scan: \n', error)
  }
}
async function getScanResult (token, collection, key) {
  const fetchUrl = `${avBaseUrl}files/${collection}/${key}`
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
      const { status, createdOn, modifiedOn, key, collection, fileName } = data
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
module.exports = { getToken, sendToAvScan, getScanResult }
