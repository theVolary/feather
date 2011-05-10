#!/bin/bash

clear
echo -n "where do you want the app? "
read LOC
echo -n "Name your app: "
read NAME

FULLPATH=$LOC/$NAME

echo -n "A feather app will be created at $FULLPATH.  Ok? [y]: "
READ OK

if [ "$OK" = "" ]; then
  OK="y"
fi

if [ "$OK" = "y" ]; then
  OLDPWD=`pwd`
  mkdir -pv $FULLPATH
  cd $FULLPATH
  mkdir -v public lib node_modules
  echo "Add your own js libraries here." > lib/README.txt
  echo "exports.onReady = function() {" > app.js
  echo "  " >> app.js
  echo "}" >> app.js
  echo "{}" > config.json
  cd public
  mkdir -v widgets
  cd $OLDPWD
  echo "App created."
  
else

  echo "Aborting."
  
fi