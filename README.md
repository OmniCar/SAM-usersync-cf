# SAM-usersync-cf

This cloud function listens for user events on Google Pub/sub and synchronises user data with Omnicar's Agillic instance
as required.

All compiled JavaScript files need to be in the root - but they are in .gitignore, which means you can't deploy
succesfully unless you compile first.

Below you'll find instructions on how to get started - enjoy :)

## Local development

### Requirements

nvm:

`wget -qO- https://raw.githubusercontent.com/creationix/nvm/v0.33.8/install.sh | bash`
`nvm install`

Ensure that there's a `client-secret-non-production.json` in the root directory of your project, with valid
configuration settings.

### Install dependencies

`npm install`

### Compile application (`tsc`)

`npx tsc`

### Deploy functions locally

`npm deploy-local`

### Fire an event that the cloud function will capture

`gcloud pubsub topics public SAM-local-users --message "Something"`

and see logs from the emulator by running:

`gcloud function logs read --limit 50`

## Deploying

To deploy the application:

`npm deploy-prod`

and

`npm deploy-non-prod`

The deployed cloud function can be reached here:

- (non-production) -
- (production) -
