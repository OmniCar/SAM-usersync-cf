import { Publisher } from '@google-cloud/pubsub'

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
export type PubSubContext = {
  eventId: string
  resource: {
    service: string
    name: string
  }
  eventType: string
  timeStamp: string
}

export type PubSubMessage = {
  '@type': string
  attributes: Publisher.Attributes
  data: string // BASE64-encoded stringified message. We use JSON here.
}

export type PubSubEvent = {
  name: string
  payload: { [key: string]: string }
}
