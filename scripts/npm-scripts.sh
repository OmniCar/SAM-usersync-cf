deployProd() {
  npx tsc
  gcloud config set project sam-live
  gcloud functions deploy userSync --runtime nodejs8 --trigger-resource SAM-live-users --trigger-event google.pubsub.topic.publish
}

deployNonProd() {
  npx tsc
  gcloud config set project sam-non-production
  gcloud functions deploy userSync --runtime nodejs8 --trigger-resource SAM-non-production-users --trigger-event google.pubsub.topic.publish
}

deployLocal() {
  npx tsc
  functions-emulator deploy userSync --trigger-provider cloud.pubsub --trigger-resource SAM-local-users --trigger-event topic.publish
}

# Check if the function exists (bash-specific)
if declare -f "$1" > /dev/null
then
  # call arguments verbatim
  "$@"
else
  # Show a helpful error
  echo "'$1' is not a known function name" >&2
  exit 1
fi
