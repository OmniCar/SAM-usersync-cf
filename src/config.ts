import { google } from 'googleapis'

const projectConfigName = 'SAM-usersync-cf' // Same name as the repo.
let configLoaded: boolean = false

// Config is loaded manually from Google Runtime Configurator, but since the cloud function is recycled between
// invocations, this should only happen once in practice.
const config: Map<string, string> = new Map()

export function isConfigLoaded(): boolean {
  return configLoaded
}

// loadConfig uses googleapis to contact Runtime Configurator and fetch all variables for this cloud function.
export async function loadConfig() {
  const projectId = await google.auth.getProjectId()
  const rtConfig = google.runtimeconfig('v1beta1')
  const path = `projects/${projectId}/configs/${projectConfigName}`
  const auth = await google.auth.getClient({ projectId })
  const res = await rtConfig.projects.configs.variables.list({ auth, returnValues: true, parent: path })
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
export function getConfig(name: string) {
  return config.get(name)
}
