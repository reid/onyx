#!/bin/sh
testdir="test"
vows="./node_modules/vows/bin/vows"
[ ! -d $testdir ] && cd ..
if ! [ -x $vows ]; then
    echo "Unable to run Vows." >&2
    echo "Try \`make install-dev\` to install Vows." >&2
    exit $ret
fi
[ ! -e $testdir ] && \
    echo "Unable to find directory '$testdir'." >&2 && exit 1
$vows $@ $testdir/*.js
