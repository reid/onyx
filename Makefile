help:
	@echo "Type \`make all\` first to get started."
	@echo "\`make test\` for unit tests."
	@echo "\`make lint\` to run JSLint."
	@echo "\`make html\` to build HTML documentation."

all: install

install: sanity
	npm i

sanity:
	sh script/sanity.sh

test:
	sh script/test.sh test/*.js

spec:
	sh script/test.sh --spec test/*.js

smoke:
	sh script/test.sh test/smoke/*.js

smoke-spec:
	sh script/test.sh --spec test/smoke/*.js

lint:
	# Problem? Try `make install-dev`
	find lib test -name "*.js" -print0 | xargs -0 ./node_modules/.bin/jslint --forin

DOC:=doc
DOCS:=$(addprefix $(DOC)/, README.html HISTORY.html)

html: $(DOCS)

$(DOC):
	mkdir $@

$(DOCS): | $(DOC)

RONN = ./node_modules/.bin/ronn

$(DOC)/README.html: README.md
	# Problem? Try `make install`
	$(RONN) -5 $< > $@

$(DOC)/HISTORY.html: HISTORY.md
	# Problem? Try `make install`
	$(RONN) -5 $< > $@

preview: $(DOCS)
	sh script/open.sh $?
	touch preview

clean:
	rm -rf $(DOC) node_modules npm-*.log

.PHONY: help sanity install test spec lint smoke smoke-spec html preview clean
