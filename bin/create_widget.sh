#!/bin/bash

RED=$'\033[1;31m'
NO_COLOUR=$'\033[0m'
clear
echo -n "Which app? "
read APP
echo -n "Where do you want your widget inside of public? (e.g. widgets): "
read LOCATION
echo $RED "WARNING: This script does NOT check if the widget already exists, and will OVERWRITE if so!" $NO_COLOUR 
echo -n "Name your widget: "
read NAME

FULLPATH="${APP}/public/${LOCATION}/${NAME}"

CLIENT_TEMPLATE=$(cat <<EOF
feather.ns("${APP}");
(function() {	
  ${APP}.${NAME} = feather.widget.create({
    name: "${APP}.${NAME}",
    path: "${LOCATION}/${NAME}/",
    prototype: {
      initialize: function(\$super, options) {
        \$super(options);
      }
    }		
  });	
})();
EOF
)

SERVER_TEMPLATE=$(cat <<EOF
feather.ns("${APP}");
${APP}.${NAME} = feather.widget.create({
  name: "${APP}.${NAME}",
  path: "${LOCATION}/${NAME}/",
  prototype: {
    initialize: function(\$super, options) {
      \$super(options);
    }
  }		
});

EOF
)

mkdir -pv $FULLPATH
echo "$CLIENT_TEMPLATE" > "${FULLPATH}/${NAME}.client.js"
echo "$SERVER_TEMPLATE" > "${FULLPATH}/${NAME}.server.js"
echo "" > "${FULLPATH}/${NAME}.template.html"
echo -e "Thanks!  Your widget awaits.\a"
