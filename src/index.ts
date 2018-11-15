// Note about this implementation: Google Cloud Functions (GCF) will attempt to keep the function alive between requests
// which means that global variables will be retained between requests. I'm leveraging this where possible in order to
// avoid unnecessary lookups eg. when retrieving variables from Google Runtime Configurator (GRC) and access tokens
// from Agillic. But also note that the cloud function _will_ be restarted occasionally!

import { Publisher } from '@google-cloud/pubsub'
import { logError, logInfo } from '@omnicar/sam-log'
import { isConfigLoaded, loadConfig } from './config'
import { userCreated, userUpdated } from './handlers'

// Description of context (example):
// {
//   eventId: '5014a019-89ff-4b79-9c0e-d3e8d98dcf31',
//   resource: {
//     service: 'pubsub.googleapis.com',
//     name: 'projects/sam-non-production/topics/SAM-local-users'
// },
// eventType: 'google.pubsub.topic.publish',
// timestamp: '2018-11-09T10:05:48.926Z'
// }
type PubSubContext = {
  eventId: string
  resource: {
    service: string
    name: string
  }
  eventType: string
  timeStamp: string
}

// When adding new event handles, don't forget to add them to this list.
const eventHandlers: Map<string, (name: string, data: Publisher.Attributes) => void> = new Map()
eventHandlers.set('users.created', userCreated)
eventHandlers.set('users.updated', userUpdated)

// userSync receives an event via Google Pub/Sub.
export async function userSync(data: Publisher.Attributes, context: PubSubContext) {
  if (!isConfigLoaded()) {
    await loadConfig()
  }
  let payload: any
  try {
    payload = JSON.parse(Buffer.from(String(data.data), 'base64').toString())
  } catch (err) {
    err.message = `Unable to parse message: ${String(data.data)}, ${err.message}`
    throw err
  }
  const name = String(payload.name)
  if (!name) {
    throw Error(`Received event without a name`)
  }
  logInfo(`${context.resource.name} Incoming event: ${name}`)
  const handler = eventHandlers.get(name)
  if (!handler) {
    throw Error(`Unsupported event type: ${name}, aborting`)
  }
  try {
    await handler(name, payload)
  } catch (err) {
    logError(`${name}: Error during processing - ${err.message}`)
    logError(`${err}`)
    logError(`Payload: ${JSON.stringify(payload, null, 2)}`)
    logError(`Event failed: ${name}`)
    return
  }
  logInfo(`Event handled: ${name}`)
}

// node index.js test
if (process.argv.length > 2 && process.argv[2] === 'test') {
  userSync(
    { name: 'users.created', id: '542' },
    {
      eventId: '5014a019-89ff-4b79-9c0e-d3e8d98dcf31',
      resource: {
        service: 'pubsub.googleapis.com',
        name: 'projects/sam-non-production/topics/SAM-local-users',
      },
      eventType: 'google.pubsub.topic.publish',
      timeStamp: '2018-11-09T10:05:48.926Z',
    },
  )
    .then(() => {
      logInfo('Done')
    })
    .catch(logError)
}
