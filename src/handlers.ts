import { logInfo } from '@omnicar/sam-log'
import { createRecipient, getRecipient, updateRecipient } from './agillic'
import { connect, disconnect, getUserByID } from './db'

// Event handler for users.created.
export async function userCreated(name: string, data: any) {
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
    if (!['admin', 'seller'].includes(usr.role!)) {
      logInfo(`Skipping user #${usr.id} because user is a ${usr.role}`)
      return
    }

    // Check if the user exists. rcpt is "recipient".
    const rcpt = await getRecipient(usr.email)
    if (rcpt) {
      // Rcpt exists, so we update instead.
      await updateRecipient(usr)
    } else {
      // Create the rcpt.
      await createRecipient(usr)
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
export async function userUpdated(name: string, data: any) {
  await userCreated(name, data)
}
