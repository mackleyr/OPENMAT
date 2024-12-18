#!/usr/bin/env bash

# Check if local .env exists
if [ ! -f .env ]; then
  echo "No local .env file found in current directory. Please run this in your project's root directory."
  exit 1
fi

echo "Extracting local environment variables from .env..."
cp .env /tmp/local_env_$$.txt

echo
echo "Please paste your production (www.and.deals) .env content now."
echo "When finished, press Ctrl+D on a blank line to end input."
echo

cat > /tmp/prod_env_$$.txt

echo
echo "Comparing local .env to production .env..."
echo "-----------------------------------------"
diff --strip-trailing-cr -u /tmp/local_env_$$.txt /tmp/prod_env_$$.txt || true

echo
echo "Diff completed. Lines starting with '-' are in local but not prod or differ, and '+' lines are in prod but not local or differ."
echo "If there is no output, the files match."

# Cleanup
rm /tmp/local_env_$$.txt /tmp/prod_env_$$.txt 2>/dev/null
