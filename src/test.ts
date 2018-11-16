// Usage: node test.js

import { logError, logInfo } from '@omnicar/sam-log'
import { userSync } from '.'
import { PubSubMessage } from './types'

const msg: PubSubMessage = {
  '@type': 'type.googleapis.com/google.pubsub.v1.PubsubMessage',
  attributes: {},
  data: Buffer.from(JSON.stringify({ name: 'users.created', payload: { id: '542' } })).toString('base64'),
}

// node index.js test
userSync(msg, {
  eventId: '5014a019-89ff-4b79-9c0e-d3e8d98dcf31',
  resource: {
    service: 'pubsub.googleapis.com',
    name: 'projects/sam-non-production/topics/SAM-local-users',
  },
  eventType: 'google.pubsub.topic.publish',
  timeStamp: '2018-11-09T10:05:48.926Z',
})
  .then(() => {
    logInfo('Done')
  })
  .catch(logError)
