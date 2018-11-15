import * as MySQL from 'mysql2/promise'
import { getConfig } from './config'

export type UserEssentials = {
  id: number
  email: string
  name: string
  phone: string
  companyName: string
}

let conn: MySQL.Connection | undefined

let userSelect: string = ''

export async function connect() {
  if (conn) {
    return
  }
  const socketPath = getConfig('database/socket')
  const host = getConfig('database/hostname')
  const user = getConfig('database/user')
  const password = getConfig('database/password')
  const database = getConfig('database/dbname')
  if (socketPath) {
    conn = await MySQL.createConnection({ socketPath })
  } else if (host && user && password && database) {
    conn = await MySQL.createConnection({ host, user, password, database })
  } else {
    throw Error(
      `DB: Missing connection options host, user, password, database name or socket path, please check your Google Runtime Configurator setup`,
    )
  }

  prepareStatements()
}

export async function disconnect() {
  if (!conn) {
    return
  }
  return await conn.end()
}

function prepareStatements() {
  // User query.
  const sql =
    'SELECT u.user_id, u.email, cp.name, cp.phone, prov.administrativeName AS companyname' +
    ' FROM user AS u' +
    ' JOIN contact_person AS cp ON cp.contact_person_id = u.contact_person_id' +
    ' JOIN contract_provider AS prov ON prov.contract_provider_id = (' +
    "SELECT SUBSTRING(SUBSTRING_INDEX(USER.permissions, ':', 2), 4) FROM user WHERE user_id = ?" +
    ')' +
    ' WHERE u.user_id = ?'
  userSelect = MySQL.format(sql, [])
}

export async function getUserByID(usrId: number): Promise<UserEssentials | undefined> {
  if (!conn) {
    throw Error(`DB: Not connected to a database`)
  }
  const [rows, fields] = await conn.query<MySQL.RowDataPacket[]>(userSelect, [usrId, usrId])
  if (rows.length === 0) {
    return
  }
  return {
    id: rows[0].user_id,
    email: rows[0].email.trim(),
    name: rows[0].name.trim(),
    phone: rows[0].phone.replace(/ /g, ''),
    companyName: rows[0].companyname.trim(),
  }
}
