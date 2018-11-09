import { Publisher } from '@google-cloud/pubsub'
import { google } from 'googleapis'

const projectConfigName = 'SAM-usersync-cf' // Same name as the repo.

// Config is loaded manually from Google Runtime Configurator, but since the cloud function is recycled between
// invocations, this should only happen once in practice.
const config: Map<string, string> = new Map()
let configLoaded: boolean = false

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

// userSync receives an event via Google Pub/Sub.
export async function userSync(data: Publisher.Attributes, context: PubSubContext) {
  if (!isConfigLoaded()) {
    await loadConfig()
  }
  const agillicBaseURL = getConfig('agillic/base-url')
  if (!agillicBaseURL) {
    throw Error(`userSync: missing important variables from Runtime Configurator, please check your GCP project`)
  }
  console.log('Received event:', data, context)
}

function isConfigLoaded(): boolean {
  return configLoaded
}

// loadConfig uses googleapis to contact Runtime Configurator and fetch all variables for this cloud function.
async function loadConfig() {
  const key = require('./client-secret-non-production') // @TODO: need to match actual file name.
  const jwtClient = new google.auth.JWT(key.client_email, undefined, key.private_key, [
    'https://www.googleapis.com/auth/cloudruntimeconfig',
  ])
  const creds = await jwtClient.authorize()
  const projectId = await google.auth.getProjectId()
  const rtConfig = google.runtimeconfig('v1beta1')
  const path = `projects/${projectId}/configs/${projectConfigName}`
  const res = await rtConfig.projects.configs.variables.list({
    auth: jwtClient,
    parent: path,
    returnValues: true,
  })
  if (res.status !== 200) {
    throw Error(
      `loadConfig: unable to fetch configuration from Runtime Configurator, reply: ${res.status} ${res.statusText}`,
    )
  }
  if (!Array.isArray(res.data.variables)) {
    throw Error(
      `loadConfig: received reply from Runtime Configurator, but did not receive an array of variables, instead got "${typeof res
        .data.variables}"`,
    )
  }
  config.clear()
  for (const cfgVar of res.data.variables) {
    if (cfgVar.name && cfgVar.text) {
      const shortName = String(cfgVar.name).replace(`${path}/variables/`, '')
      config.set(shortName, String(cfgVar.text))
    }
  }
}

// getConfig is a simple wrapper around the GCloud runtime config structure.
function getConfig(name: string) {
  return config.get(name)
}

// node index.js test
if (process.argv.length > 2 && process.argv[2] === 'test') {
  userSync(
    { id: '1' },
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
