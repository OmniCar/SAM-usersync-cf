import { Publisher } from '@google-cloud/pubsub'
import { getAgillicAccessToken, PersonResult, getRecipient, updateRecipient, createRecipient } from './agillic'
import { getConfig } from './config'
import { connect, disconnect, getUserByID, UserEssentials } from './db'

// Event handler for users.created.
export async function userCreated(name: string, data: Publisher.Attributes) {
  const usrId = parseInt(String(data.id), 10)
  if (!usrId) {
    throw Error(`${name}: Received event without a user id`)
  }

  // Find the user in the database.
  await connect()
  try {
    const usr = await getUserByID(usrId)
    if (!usr) {
      throw Error(`${name}: No user with user id #${usrId}`)
    }

    // Check if the user exists. rcpt is "recipient".
    const rcpt = await getRecipient(usr.email)
    const usrData: UserEssentials = {
      id: usr.id,
      email: usr.email,
      name: usr.name,
      phone: usr.phone,
      companyName: usr.companyName,
    }
    if (rcpt) {
      // Rcpt exists, so we update instead.
      await updateRecipient(usrData)
    } else {
      // Create the rcpt.
      await createRecipient(usrData)
    }
  } catch (err) {
    // We just release resources here, error reporting is done in the index file.
    await disconnect()
    throw err
  }
  // Done. Process will hang unless we disconnect.
  await disconnect()
}

// Note: for now, we want the same functionality as in "userCreated". This covers the scenario where not all users
// exists as recipients in Agillic. By using the same algorithm, they will simply be created if they don't exist.
export async function userUpdated(name: string, data: Publisher.Attributes) {
  await userCreated(name, data)
}
