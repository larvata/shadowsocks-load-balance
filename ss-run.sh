#!/bin/sh
# set -x

input="ss.lst"
# idx=0
# lport=9000
logfile="ss.log"
logpath=/var/log/$logfile

if [ -f "$logpath" ]; then
  echo "Last ss log has been cleared."
  rm $logpath
fi

while IFS= read -r line
do
  # if [ $idx == 0 ]; then
  #   port=$line
  # fi
  # if [ $idx == 1 ]; then
  #   method=$line
  # fi
  # if [ $idx == 2 ]; then
  #   key=$line
  # fi

  if [ $idx -gt 2 ] && [ ! -z "$line" ]; then
    # cmd="ss-local -s $line -p $port -m $method -k $key -l $lport -b 0.0.0.0 --plugin obfs-local --plugin-opts 'obfs=http;obfs-host=a9fa6129375.microsoft.com'"
    # lport=$((lport+1))

    if [ "$1" == "-v" ]; then
      cmd="$line -v >> $logpath &"
    else
      cmd="$line -f $idx.pid"
    fi
    # echo $cmd
    eval "$cmd"
  fi

  idx=$((idx+1))
done < $input

# after run all the ss-local pull the log to console
echo All ss-local are started.

if [ "$1" == "-v" ]; then
  tail -f $logpath
else
  tail -f /dev/null
fi
