const Wreck = require('@hapi/wreck')
const tokenUrl = process.env.AV_ACCESS_TOKEN_URL
const clientId = process.env.AV_CLIENT_ID
const clientSecret = process.env.AV_CLIENT_SECRET
const scope = process.env.AV_SCOPE
const grantType = process.env.AV_AUTH_GRANT_TYPE
const avBaseUrl = process.env.AV_BASE_URL

const getTokenRequestBody = new URLSearchParams({
  grant_type: grantType,
  client_id: clientId,
  client_secret: clientSecret,
  scope
})
const getTokenHeaders = {
  'Content-Type': 'application/x-www-form-urlencoded'
}
async function getToken () {
  try {
    const { res, payload } = await Wreck.post(tokenUrl, {
      payload: getTokenRequestBody.toString(),
      headers: getTokenHeaders
    })
    if (res.statusCode !== 200) {
      throw new Error(
        `Token Request Failed: ${res.statusCode} ${res.statusMessage}`
      )
    }
    const token = JSON.parse(payload.toString('utf8'))
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
    const { payload, res } = await Wreck.put(fetchUrl, {
      payload: fileDetails,
      headers,
      json: true
    })
    if (res.statusCode === 200) {
      const data = payload.toString('utf8')
      const status = data.split(' ')[1]
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
      }
    } else if (res.statusCode === 504) {
      return {
        status: 'un-readable',
        key: fileDetails.key,
        collection: fileDetails.collection,
        fileName: fileDetails.fileName,
        isSafe: false,
        isScanned: true
      }
    } else {
      throw new Error('Could not get a successful response from the server')
    }
    console.log('<<<Scanned Finished!>>>')
  } catch (error) {
    console.log('Error in sending file to scan: \n', error)
  }
}

module.exports = { getToken, sendToAvScan }
