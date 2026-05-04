HOMEDIR = $(shell pwd)

build: images
	npx @11ty/eleventy \
    --config=eleventy-config.js \
    --output=rehydrate

images:
	mogrify -resize 800x800\> -quality 75 -path media src-media/rehydrate-*

serve: images
	npx @11ty/eleventy \
		--output=rehydrate \
		--config=eleventy-config.js \
		--serve

prettier:
	prettier --single-quote --write "**/*.js"
