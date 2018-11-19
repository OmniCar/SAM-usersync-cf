import { logError } from '@omnicar/sam-log'
import * as MySQL from 'mysql2/promise'
import { getConfig } from './config'

export type UserEssentials = {
  id: number
  role?: string
  email: string
  name: string
  phone: string
  address: string
  zip: string
  city: string
  country: string
  cvr: string
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
  const opts: MySQL.ConnectionOptions = {
    user,
    password,
    database,
  }
  if (socketPath) {
    opts.socketPath = socketPath
  } else if (host) {
    opts.host = host
  } else {
    throw Error(
      `DB: Missing connection options host, user, password, database name or socket path, please check your Google Runtime Configurator setup`,
    )
  }

  conn = await MySQL.createConnection(opts)
  prepareStatements()
}

export async function disconnect() {
  if (!conn) {
    return
  }
  try {
    await conn.end()
  } catch (err) {
    logError('Unable to disconnect from database')
    return
  }
}

function prepareStatements() {
  // User query.
  const sql =
    'SELECT' +
    ' u.user_id, u.email, cp.name, cp.phone, addr.address1, addr.address2, addr.city, addr.postal_code AS zip,' +
    ' c.iso_name AS country, prov.administrativeName AS companyname, prov.cvrCode AS cvr, u.permissions' +
    ' FROM user AS u' +
    ' JOIN contact_person AS cp ON cp.contact_person_id = u.contact_person_id' +
    ' JOIN address AS addr ON addr.address_id = cp.address_id' +
    ' JOIN country AS c ON c.country_id = addr.country_id' +
    ' JOIN contract_provider AS prov ON prov.contract_provider_id = (' +
    "SELECT SUBSTRING(SUBSTRING_INDEX(permissions, ':', 2), 4) FROM user WHERE user_id = ?" +
    ')' +
    ' WHERE u.user_id = ?'
  userSelect = MySQL.format(sql, [])
}

export async function getUserByID(usrId: number): Promise<UserEssentials | undefined> {
  if (!conn) {
    throw Error(`DB: Not connected to a database`)
  }
  const [rows, fields] = await conn.query<MySQL.RowDataPacket[]>(userSelect, [usrId, usrId])
  if (!rows || rows.length === 0) {
    return
  }
  let role: string = 'customer'
  if (/contracts:delete/i.test(rows[0].permissions)) {
    role = 'admin'
  } else if (/contracts:update/i.test(rows[0].permissions)) {
    role = 'seller'
  }
  const address = rows[0].address1 + (rows[0].address2 ? ', ' + rows[0].address2.trim() : '')
  return {
    id: rows[0].user_id,
    role,
    email: rows[0].email.trim(),
    name: rows[0].name.trim(),
    phone: rows[0].phone.replace(/ /g, ''),
    address,
    zip: rows[0].zip.trim(),
    city: rows[0].city.trim(),
    country: rows[0].country.trim(),
    cvr: rows[0].cvr.trim(),
    companyName: rows[0].companyname.trim(),
  }
}
