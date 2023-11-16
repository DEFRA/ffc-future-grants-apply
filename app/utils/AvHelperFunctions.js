const axios = require('axios');

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
async function getToken() {
  try {
    const response = await fetch(tokenUrl, getTokenFetchOptions)
    if (!response.ok) {
        throw new Error(`Token Request Failed: ${response.status} ${response.statusText}`)
    }
    const token = await response.json()
    return {token, isTokenExist: true}
  } catch (error) {
    console.log('ERROR: ', error)
    throw error
  }
}
async function sendToAvScan (accesToken, collection, file, fileDetails, key) {
    const token = `${accesToken.token_type} ${accesToken.access_token}`
  const formData = new FormData()
  formData.append('fileDetails', JSON.stringify(fileDetails))
  console.log({...file})
 formData.append('file', file)
  const fetchUrl = `${avBaseUrl}files/stream/${collection}/${key}`
  console.log(fetchUrl)
  const headers = {
    'Authorization': token  }
  try {
   const response = await axios.put(fetchUrl, formData, {headers})
   console.log('response=====> \n', response)
//    if (response.status === 204) {
//     const scanResponse = await getScanResult(token, collection, key)
//     console.log('scanResponse========>\n', scanResponse)
//     if (scanResponse.isSafe){
//       return {...scanResponse, statusCode: 204}
//     }else{
//         return {...scanResponse, statusCode: 401}
//     }
//    }
  } catch (error) {
    console.log("ERROR=======>\n", error)
  }
}
async function getScanResult (token, collection, key ) {
  const fetchUrl = `${avBaseUrl}${collection}/${key}`
  const getResultFetchOptions = {
    method: 'GET',
    body: null,
    headers: {
        'Authorization': token
    }
  }
  try {
    const response = await fetch(fetchUrl, getResultFetchOptions)
    const data = await response.json()
    if (data.status && data.status === 'Success'){
        return {
            error: '',
            isSafe: true,
        }
    }else{
        return {
            error: 'error',
            isSafe: false,
        }
    }

  } catch (error) {
    console.log('Get Scan Result Error: ',error);
  }
}

module.exports={getToken, sendToAvScan, getScanResult}