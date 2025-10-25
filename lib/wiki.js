module.exports = {
    /**
     * Extracts tool information from wiki page content.
     *
     * @param content string
     * @param ignoredFields string[]
     * @returns {{name: void | string, value}[]|null}
     */
    extractToolData: (content, ignoredFields) => {
        const matches = (content ?? '').match(/{{Tool\n([^}]+)/g)
        if (matches == null || matches.length === 0) {
            return null
        }
       return matches[0]
            .replaceAll("{{Tool\n", "")
            .replaceAll("}}", "")
            .replaceAll("\n", "")
            .split("|")
            .map((keyval) => {
                [name, value] = keyval.split("=")
                return {name, value: value || 'NA'}
            })
           .filter((row) => row.name && row.value && !ignoredFields.includes(row.name))
    }
}