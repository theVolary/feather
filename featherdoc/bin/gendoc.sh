#!/bin/sh 

if [ "$1" == "--help" ]; then

  node lib/node-jsdoc-toolkit/app/run.js --help

else
  
  C=`pwd | rev`
  C=`echo $C | awk -F \/ '{print $1}' | rev`
  if [ "$C" != "featherdoc" ]; then
    echo "Curr dir is $C.  You must run this script from the featherdoc directory."
    exit 1
  fi
  
  node lib/node-jsdoc-toolkit/app/run.js --exclude="date\.js$" --exclude="jquery.*\.js$" --exclude=".*test.*" --exclude="socket\.io\.client" --exclude="node-htmlparser" --verbose --multiple --recurse  --directory=public/docs/api --template=lib/node-jsdoc-toolkit/templates/codeview ../lib/node-core-enhancements ../lib  

fi