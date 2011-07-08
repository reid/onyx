#!/bin/sh
vows="./node_modules/.bin/vows"
[ ! -x $vows ] && cd ..
if [ ! -x $vows ]; then
    echo "Unable to run Vows." >&2
    echo "Try \`make install-dev\` to install Vows." >&2
    exit $ret
fi
$vows $@
