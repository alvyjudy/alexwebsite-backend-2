#!/bin/bash

export TESTENV="cloud";

#check if cloud_sql_proxy exists 
which cloud_sql_proxy >/dev/null || \
{ echo "cloud_sql_proxy program not found"; exit 1; }

#check if yarn is available 
which yarn >/dev/null || \
{ echo "yarn not found"; exit 1; }

echo "Tests will be using cloud SQL database";

cloud_sql_proxy -instances="kahului:northamerica-northeast1:dev-db=tcp:5888" & 

proxyPID=$!

yarn run jest tests/setup.test.js && yarn run jest && kill $proxyPID