#!/bin/bash

echo -n "Where is your feather installation? [`pwd`]"
read FEATHER_HOME

if [ "$FEATHER_HOME" = "" ]; then
  FEATHER_HOME=`pwd`
fi

# Preferably append to .bashrc.  Most systems that use .bashrc typically don't use .profile by default.

if [ -f "$HOME/.bashrc" ]; then
  echo "" >> ~/.bashrc
  echo "# Feather Vars" >> ~/.bashrc
  echo "export FEATHER_HOME=$FEATHER_HOME" >> ~/.bashrc
  echo "export PATH=$FEATHER_HOME/bin:$PATH" >> ~/.bashrc
else
  echo "" >> ~/.profile
  echo "# Feather Vars" >> ~/.profile 
  echo "export FEATHER_HOME=$FEATHER_HOME" >> ~/.profile
  echo "export PATH=$FEATHER_HOME/bin:$PATH" >> ~/.profile
fi
export FEATHER_HOME
export PATH=$FEATHER_HOME/bin:$PATH
echo "Setup complete."