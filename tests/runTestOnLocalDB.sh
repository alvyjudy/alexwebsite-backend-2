#!/bin/bash

#check if yarn is available 
which yarn >/dev/null || \
echo "yarn not found"; exit 1

export TESTENV="local"
yarn run jest tests/setup.test.js && yarn run jest;

