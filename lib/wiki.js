const wikiURL =  'https://wiki.nottinghack.org.uk'

module.exports = {

    wikiURL: wikiURL,

    /**
     * Extracts the data from the table shown at the top of a page, along with a type
     * that describes the page (e.g. Tool)
     *
     * @param {string} content The wiki markdown as a string.
     * @returns {{pageType: string, raw: string, rows: ({name: string, value: string}|{name: void | string, value})[]}|null}
     */
    extractPageData: (content) => {
        const matches = [...(content ?? '').matchAll(/{{([\sa-z0-9]+)\n([^}]+)}}/gi)];
        if (matches.length === 0) {
            return null;
        }

       return {
           pageType: matches[0][1],
           raw: matches[0][0],
           rows: matches[0][2]
               .replaceAll("\n", "")
               .split("|")
               .map((keyval) => {
                   [name, value] = keyval.split("=")
                   return {name, value: value || 'NA'}
               })
               .filter((row) => row.name && row.value )
       };
    },

    fixRelativeLinks(wikitext)  {
        // match any links that look like [foo](./bar) but not [foo](http://whatever.com)
        return wikitext.replaceAll(/\[[^\]]+\]\((\.[^)]+)\)/g, (match, path) => {
            // discard the first character of the path since it will be a `.` if the regex matched.
            return match.replace(path, `${wikiURL}${path.slice(1)}`)
        })
    },

    removeImages(wikitext)  {
        return wikitext.replaceAll(/!\[[^\]]+\]\(([^)]+)\)/g, '')
    },

    imageUrl(imageName) {
        if (!imageName) {
            return null
        }
        return `${wikiURL}/images/a/ad/${encodeURIComponent(imageName.replace('File:','').replaceAll(' ', '_').trim())}`
    }
}