#!/bin/sh -e
### BEGIN INIT INFO
# Provides:          apache2
# Required-Start:    $local_fs $remote_fs $network $syslog
# Required-Stop:     $local_fs $remote_fs $network $syslog
# Default-Start:     2 3 4 5
# Default-Stop:      0 1 6
# X-Interactive:     true
# Short-Description: Start/stop apache2 web server
### END INIT INFO

# BEGIN CHANGE SECTION

APP_NAME=feather
SUPPORT_EMAIL=""
PIDFILE=/var/run/${APP_NAME}.pid
HOME=/home/ubuntu/mainline/${APP_NAME}
FEATHER_HOME=/home/ubuntu/mainline/fvm/v0.1.82
NVM_DIR=/home/ubuntu/.nvm/v0.4.12

# END CHANGE SECTION

chdir $HOME
env FEATHER_HOME=$FEATHER_HOME
PATH=$FEATHER_HOME/bin:$NVM_DIR/bin:$PATH 
FEATHER_HOME=$FEATHER_HOME 

. /lib/lsb/init-functions

pidof_feather() {
  if [ -e "$PIDFILE" ]; then
    cat $PIDFILE
  fi
  return 0
}

feather_stop() {
  pidof_feather
  if [ $PID ]; then
    kill -TERM $PID
  fi
}

feather_start() {
  sh -c "$FEATHER_HOME/bin/feather -z -p $HOME --pidpath ${PIDFILE} run"

  if [ "$SUPPORT_EMAIL" != "" ]; then
    DT=`date`
    echo "Started ${APP_NAME} on $DT" | mail -s "${APP_NAME} Restart" "$SUPPORT_EMAIL"
  fi
  log_end_msg 0
}

feather_wait_stop() {
  #running?
  PIDTMP=$(pidof_feather) || true
  if kill -0 "${PIDTMP:-}" 2> /dev/null; then
      PID=$PIDTMP
  fi

  feather_stop

  # wait until really stopped (borrowed from apache2's init.d script)
  if [ -n "${PID:-}" ]; then
    i=0
    while kill -0 "${PID:-}" 2> /dev/null;  do
      if [ $i = '60' ]; then
        break;
      else
        if [ $i = '0' ]; then
          echo -n " ... waiting "
        else
          echo -n "."
        fi
        i=$(($i+1))
        sleep 1
    fi
     done
  fi
}

case $1 in 
  start)
    log_daemon_msg "Starting web server" "${APP_NAME}"
    feather_start
  ;;
  stop)
    log_daemon_msg "Stopping web server" "${APP_NAME}"
    if feather_wait_stop; then
      log_end_msg 0
    else
      log_end_msg 1
    fi
  ;;
  status)
    PID=$(pidof_feather) || true
    if [ -n "$PID" ]; then
      echo "Feather (${APP_NAME}) is running (pid $PID)."
      exit 0
    else
      echo "Feather (${APP_NAME}) is NOT running."
      exit 1
    fi
  ;;
  *)
    log_success_msg "Usage: /etc/init.d/${APP_NAME} {start|stop|status}"
    exit 1
  ;;
esac
