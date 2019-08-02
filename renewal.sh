#!/bin/sh

export $(cat .env | xargs)

echo $SS_SUBSCRIPTION
curl $SS_SUBSCRIPTION | ./build.js

