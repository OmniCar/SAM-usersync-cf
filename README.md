# SAM-usersync-cf

This cloud function listens for user events on Google Pub/sub and synchronises user data with Omnicar's Agillic instance
as required.

The current requirements is for only admins and sellers to be synchronised with Agillic.

All compiled JavaScript files need to be in the root - but they are in .gitignore, which means you can't deploy
succesfully unless you compile first.

Below you'll find instructions on how to get started - enjoy :)

_Note: we're using GCF BETA, which is running off node.js 8.x. When it goes out of beta, if might become necessary to
make some changes to the implementation if the API/tools change._

## Description

The cloud function needs two forms of access: the Agillic API, and the SAM MySQL database. Both are configured via
variables that you need to set up manually (for now) via Google Runtime Configurator. The variables you'll need are
described under the deployment section below.

## Local development

_Note: It requires a bit more experimentation in order to make these steps actually work..._

### Requirements

nvm:

`wget -qO- https://raw.githubusercontent.com/creationix/nvm/v0.33.8/install.sh | bash`

`nvm install`

Google Cloud Function Emulator

`npm install -g @google-cloud/functions-emulator`

~~Ensure that there's a `client-secret-non-production.json` in the root directory of your project, with valid
configuration settings.~~ This is not currently supported.

### Install dependencies

`npm install`

### Compile application (with TypeScript)

`npx tsc`

### Deploy functions locally

`npm deploy-local`

### Fire an event that the cloud function will capture

`gcloud pubsub topics publish SAM-local-users --message "{id:542,name:'users.created'}"`

and see logs from the emulator by running:

`gcloud function logs read --limit 50`

## Deploying

1. Pick a project: `gcloud config set project <project-name>`.

2. Ensure that the topic used for subscribing to user events exists: `gcloud pubsub topics create <topic>`.
   As the topic is defined in the deployment script `npm-scripts.sh`, it needs to match the topic mentioned for the
   matching environment. `--trigger-resource` is the topic name you need.

3. Ensure that GRC (Google Runtime Configurator) has the variables required for the function to run:

   ```bash
   gcloud beta runtime-config configs create SAM-usersync-cf
   gcloud beta runtime-config configs variables set --config-name SAM-usersync-cf --is-text agillic/base-url "<value>"
   gcloud beta runtime-config configs variables set --config-name SAM-usersync-cf --is-text agillic/client-id "<value>"
   gcloud beta runtime-config configs variables set --config-name SAM-usersync-cf --is-text agillic/client-secret "<value>"
   gcloud beta runtime-config configs variables set --config-name SAM-usersync-cf --is-text database/socket "<value>"
   gcloud beta runtime-config configs variables set --config-name SAM-usersync-cf --is-text database/hostname "<value>"
   gcloud beta runtime-config configs variables set --config-name SAM-usersync-cf --is-text database/user "<value>"
   gcloud beta runtime-config configs variables set --config-name SAM-usersync-cf --is-text database/password "<value>"
   gcloud beta runtime-config configs variables set --config-name SAM-usersync-cf --is-text database/dbname "<value>"
   ```

   For the database configuration, you either need `database/socket` or `database/host` variables, not both.
   The Agillic URL and authentication details are available from the OmniCar instance control panel
   at [API Integrations](https://omnicar-stag.agillic.eu/agillicadmin).

4. Deploy the application: `npm deploy-prod` / `npm deploy-non-prod`.

5. Check the [GCloud Console](https://console.cloud.google.com) to verify that your setup is working.

   You can test the cloud functional manually by publishing an event to it. Example payload:

   ```json
   {
       "name": "users.created",
       "id": "<user-id>"
   }
   ```

   The user id must be the id of an existing user from the `user` table in the SAM database for the current environment.
