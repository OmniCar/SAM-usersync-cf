// Note about this implementation: Google Cloud Functions (GCF) will attempt to keep the function alive between requests
// which means that global variables will be retained between requests. I'm leveraging this where possible in order to
// avoid unnecessary lookups eg. when retrieving variables from Google Runtime Configurator (GRC) and access tokens
// from Agillic. But also note that the cloud function _will_ be restarted occasionally!

import { Publisher } from '@google-cloud/pubsub'
import { logError, logInfo } from '@omnicar/sam-log'
import { isConfigLoaded, loadConfig } from './config'
import { userCreated, userUpdated } from './handlers'
import { PubSubContext, PubSubEvent, PubSubMessage } from './types'

// When adding new event handles, don't forget to add them to this list.
const eventHandlers: Map<string, (name: string, data: Publisher.Attributes) => void> = new Map()
eventHandlers.set('users.created', userCreated)
eventHandlers.set('users.updated', userUpdated)

// userSync receives an event via Google Pub/Sub.
// Layout of data:
// {
//   '@type': 'type.googleapis.com/google.pubsub.v1.PubsubMessage',
//   attributes: { ... },
//   data: 'ewoJIm5hbWUiOiAidXNlcnMudXBkYXRlZCIsCgkiaWQiOiA1NDIKfQ=='
// }
export async function userSync(data: PubSubMessage, context: PubSubContext) {
  if (!isConfigLoaded()) {
    await loadConfig()
  }
  const decoded = Buffer.from(String(data.data), 'base64').toString()
  let event: PubSubEvent
  try {
    event = JSON.parse(decoded)
  } catch (err) {
    err.message = `Unable to parse message: ${decoded}, ${err.message}`
    throw err
  }
  const name = String(event.name)
  if (!name) {
    throw Error(`Received event without a name`)
  }
  logInfo(`${context.resource.name} Incoming event: ${name}`)
  const handler = eventHandlers.get(name)
  if (!handler) {
    throw Error(`Unsupported event type: ${name}, aborting`)
  }
  try {
    await handler(name, event.payload)
  } catch (err) {
    logError(`${name}: Error during processing - ${err.message}`)
    logError(`${err}`)
    logError(`Payload: ${JSON.stringify(event, null, 2)}`)
    logError(`Event failed: ${name}`)
    return
  }
  logInfo(`Event handled: ${name}`)
}
