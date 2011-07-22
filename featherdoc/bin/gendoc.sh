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
  
  node lib/node-jsdoc-toolkit/app/run.js --exclude="date\.js$" --exclude="jquery.*\.js$" --exclude=".*test.*" --exclude="socket\.io\.client" --exclude="node-htmlparser" --exclude="feather-client" --verbose --multiple --recurse  --directory=public/docs/api/server --template=lib/node-jsdoc-toolkit/templates/codeview ../lib  

  node lib/node-jsdoc-toolkit/app/run.js --exclude="jquery.*\.js$" --exclude=".*test.*" --exclude="sha512" --exclude="json2" --verbose --multiple --recurse  --directory=public/docs/api/client --template=lib/node-jsdoc-toolkit/templates/codeview ../lib/feather-client
fi
