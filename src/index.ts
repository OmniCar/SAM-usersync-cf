// Note about this implementation: Google Cloud Functions (GCF) will attempt to keep the function alive between requests
// which means that global variables will be retained between requests. I'm leveraging this where possible in order to
// avoid unnecessary lookups eg. when retrieving variables from Google Runtime Configurator (GRC) and access tokens
// from Agillic. But also note that the cloud function _will_ be restarted occasionally!

import { Publisher } from '@google-cloud/pubsub'
import { isConfigLoaded, loadConfig } from './config'
import { userCreated } from './handlers'

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

// userSync receives an event via Google Pub/Sub.
export async function userSync(data: Publisher.Attributes, context: PubSubContext) {
  if (!isConfigLoaded()) {
    await loadConfig()
  }
  const name = String(data.name)
  if (!name) {
    throw Error(`Received event without a name`)
  }
  console.log(`${context.resource.name} Incoming event: ${name}`)
  const handler = eventHandlers.get(name)
  if (!handler) {
    throw Error(`Unsupported event type: ${name}, aborting`)
  }
  console.log(`Handling event: ${name}`)
  try {
    await handler(name, data)
  } catch (err) {
    console.error(`${name}: Error during processing - ${err.message}`)
    console.error(`${err}`)
    console.error('')
    console.error(`Event failed: ${name}`)
    return
  }
  console.log(`Event handled: ${name}`)
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
      console.log('Done')
    })
    .catch(console.error)
}
