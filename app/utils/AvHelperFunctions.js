
async function getToken() {
  const tokenUrl = process.env.AV_ACCESS_TOKEN_URL
  const clientId = process.env.AV_CLIENT_ID
  const clientSecret = process.env.AV_CLIENT_SECRET
  const scope = process.env.AV_SCOPE
  const grantType = process.env.AV_AUTH_GRANT_TYPE
  const fetchOptions = {
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
  try {
    const response = await fetch(tokenUrl, fetchOptions)
    if (!response.ok) {
        throw new Error(`Token Request Failed: ${response.status} ${response.statusText}`)
    }
    const data = await response.json()
    const accessToken = data.access_token
    return accessToken
  } catch (error) {
    console.log('ERROR: ', error)
    throw error
  }
}
function sendToAvScan () {

        return

}
function receiveFromAvScan () {

    return

}

module.exports={getToken, sendToAvScan, receiveFromAvScan}