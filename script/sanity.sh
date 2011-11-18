#!/bin/sh
pkg="package.json"
npm=`which npm 2>&1`
ret=$?
if [ $ret -ne 0 ] || ! [ -x $npm ]; then
    echo "Install npm, available at http://npmjs.org" >&2
    exit $ret
fi
[ ! -e $pkg ] && cd ..
[ ! -e $pkg ] && \
    echo "Unable to find $pkg." >&2 && exit 1
exit 0
