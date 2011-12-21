#!/bin/bash

if [ -d "$FEATHER_HOME" ]; then
  echo "FEATHER_HOME already appears to be configured for $FEATHER_HOME"
  exit 0
fi

MODULES=( connect@1.4.1 jsdom@0.2.0 socket.io@0.8.7 cradle@0.5.5 yuitest@0.6.9 daemon@0.3.0 colorize@0.1.0 cli@0.3.6 underscore@1.1.6 inherits@1.0.0 node-uuid@1.1.0 clean-css@0.2.4 uglify-js@1.0.2 mime@1.2.4 connect-gzip@0.1.5 )

GLOBAL_MODULES=( node-inspector@0.1.10 )

echo -n "Where is your feather installation? [`pwd`]"
read FEATHER_HOME

if [ "$FEATHER_HOME" = "" ]; then
  FEATHER_HOME=`pwd`
fi

# Preferably append to .bashrc.  Most systems that use .bashrc typically don't use .profile by default (*buntu).

if [ -f "$HOME/.bashrc" ]; then
  echo "" >> ~/.bashrc
  echo "# Feather Vars" >> ~/.bashrc
  echo "export FEATHER_HOME=$FEATHER_HOME" >> ~/.bashrc
  echo "export PATH=\$FEATHER_HOME/bin:\$PATH" >> ~/.bashrc
  . $HOME/.bashrc
else
  echo "" >> ~/.profile
  echo "# Feather Vars" >> ~/.profile 
  echo "export FEATHER_HOME=$FEATHER_HOME" >> ~/.profile
  echo "export PATH=\$FEATHER_HOME/bin:\$PATH" >> ~/.profile
  . $HOME/.profile
fi

echo "Installing modules."
OLDPWD=`pwd`
cd $FEATHER_HOME

# Test for npm
NPMVER=`npm --version`
if [ "${NPMVER:0:1}" != "" ] && (("${NPMVER:0:1}" >= "1")); then

  for mod in ${MODULES[@]}
  do
    echo "Installing ${mod}"
    npm install ${mod}
  done

  cd featherdoc
  mkdir node_modules
  npm install node-markdown

  echo "Setup complete."
else
  echo "feather requires npm 1.0+"
fi

cd $OLDPWD
