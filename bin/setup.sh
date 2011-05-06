#!/bin/bash

echo -n "Where is your feather installation? [`pwd`]"
read FINSTALL

if [ "$FINSTALL" = "" ]; then
  FINSTALL=`pwd`
fi

echo "" >> ~/.profile
echo "# Feather Vars" >> ~/.profile 
echo "export FEATHER_HOME=$FINSTALL" >> ~/.profile
echo "export PATH=$FEATHER_HOME/bin:$PATH" >> ~/.profile