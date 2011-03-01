#!/bin/sh
testdir="test"
vows=`which vows 2>&1`
ret=$?
if [ $ret -ne 0 ] || ! [ -x $vows ]; then
    echo "Unable to run Vows." >&2
    echo "Try \`make install-dev\` to install Vows." >&2
    exit $ret
fi
[ ! -d $testdir ] && cd ..
[ ! -e $testdir ] && \
    echo "Unable to find directory '$testdir'." >&2 && exit 1
vows $@ $testdir/*.js
