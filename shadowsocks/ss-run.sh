#!/bin/sh
# set -x

input="ss.lst"
idx=0
lport=9000
logfile="ss.log"
logpath=/var/log/$logfile

if [ -f "$logpath" ]; then
  echo "Last ss log has been cleared."
  rm $logpath
fi

while IFS= read -r line
do
  lport=$((lport+1))

  if [ "$1" == "-v" ]; then
    cmd="$line -v | sed -e 's/^/[${lport}] /;' > $logpath &"
  else
    cmd="$line -f $idx.pid | sed -e 's/^/[${lport}] /;'"
  fi

  # echo $cmd
  eval "$cmd"

  idx=$((idx+1))
done < $input

# after run all the ss-local pull the log to console
echo All ss-local are started.

if [ "$1" == "-v" ]; then
  tail -f $logpath
else
  tail -f /dev/null
fi
