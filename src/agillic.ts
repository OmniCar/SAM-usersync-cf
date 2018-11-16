import * as Request from 'request-promise-native'
import * as SOAuth2 from 'simple-oauth2'
import * as URL from 'url'
import { getConfig } from './config'
import { UserEssentials } from './db'

export type PersonResult = { personData: PersonData }

export type PersonData = { [key: string]: string }

const errAgillicCreds =
  'Agillic: unable to retrieve host, client id or secret, please check your Google Runtime Configurator setup'

let accessToken: SOAuth2.AccessToken

// Retrieves an access token from Agillic using OAuth2 Client Credentials Flow.
// If a token has already been generated, the existing token is simply returned instead. Expired tokens will be renewed.
// See: https://github.com/lelylan/simple-oauth2#client-credentials-flow.
export async function getAgillicAccessToken(
  tokenHost: string,
  id: string,
  secret: string,
): Promise<SOAuth2.AccessToken> {
  if (accessToken) {
    if (accessToken.expired()) {
      accessToken = await accessToken.refresh()
    }
    return accessToken
  }
  const creds: SOAuth2.ModuleOptions = {
    client: {
      id,
      secret,
    },
    auth: {
      tokenHost,
      tokenPath: '/oauth2/token',
    },
  }
  const oauth = SOAuth2.create(creds)
  const cnf: SOAuth2.ClientCredentialTokenConfig = {} // We don't seem to need a scope here.
  const tok = await oauth.clientCredentials.getToken(cnf)
  accessToken = oauth.accessToken.create(tok)
  return accessToken
}

// Note that the identifier used here can be something else than email, but if you use something non-unique, you will
// need to change the request into using a filter query instead. For now, it looks like you can use email, phone and
// recipient id. But phone is dangerous to use as the format is rather loose.
export async function getRecipient(email: string) {
  // Connect to Agillic.
  const tokenHost = getConfig('agillic/base-url')
  const clientId = getConfig('agillic/client-id')
  const secret = getConfig('agillic/client-secret')
  if (!tokenHost || !clientId || !secret) {
    throw Error(errAgillicCreds)
  }
  const accessToken = await getAgillicAccessToken(tokenHost, clientId, secret)
  const getURL = URL.resolve(tokenHost!, `/recipients/${email}`)
  let getRes: PersonResult
  try {
    getRes = await Request.get({
      url: getURL,
      json: true,
      auth: { bearer: accessToken.token.access_token },
    })
    if (getRes && getRes.personData && getRes.personData.EMAIL === email) {
      return getRes.personData
    }
  } catch (err) {
    // Specialise the error report.
    err.message = `Request: GET /recipients/${email}, error: ${err.message}`
    throw err
  }
  return
}

export async function createRecipient(usr: UserEssentials) {
  // Connect to Agillic.
  const tokenHost = getConfig('agillic/base-url')
  const clientId = getConfig('agillic/client-id')
  const secret = getConfig('agillic/client-secret')
  if (!tokenHost || !clientId || !secret) {
    throw Error(errAgillicCreds)
  }
  const accessToken = await getAgillicAccessToken(tokenHost, clientId, secret)
  const postURL = URL.resolve(tokenHost!, `/recipients`)
  const body = {
    personData: {
      EMAIL: usr.email,
      FULLNAME: usr.name,
      COMPANY_NAME: usr.companyName,
      MOBILE_NUMBER: usr.phone,
      CUSTOMER_PERMISSION: false,
      EMAIL_PERMISSION: false,
      SMS_PERMISSION: false,
      INVESTOR_PERMISSION: false,
      EMPLOYEE_PERMISSION: false,
      SAM_USERS_PERMISSION: true,
    },
  }
  try {
    const postRes = await Request.post({
      url: postURL,
      json: true,
      auth: { bearer: accessToken.token.access_token },
      body,
    })
  } catch (err) {
    // Specialise the error report.
    err.message = `Request: POST /recipients, error: ${err.message}`
    throw err
  }
}

export async function updateRecipient(usr: UserEssentials) {
  // Connect to Agillic.
  const tokenHost = getConfig('agillic/base-url')
  const clientId = getConfig('agillic/client-id')
  const secret = getConfig('agillic/client-secret')
  if (!tokenHost || !clientId || !secret) {
    throw Error(errAgillicCreds)
  }
  const accessToken = await getAgillicAccessToken(tokenHost, clientId, secret)
  const putURL = URL.resolve(tokenHost!, `/recipients/${usr.email}`)
  const body = {
    personData: {
      EMAIL: usr.email,
      FULLNAME: usr.name,
      COMPANY_NAME: usr.companyName,
      MOBILE_NUMBER: usr.phone,
      SAM_USERS_PERMISSION: true, // Only update the permission we have direct control of.
    },
  }
  try {
    const putRes = await Request.put({
      url: putURL,
      json: true,
      auth: { bearer: accessToken.token.access_token },
      body,
    })
  } catch (err) {
    // Specialise the error report.
    err.message = `Request: PUT /recipients/${usr.email}, error: ${err.message}`
    throw err
  }
}
