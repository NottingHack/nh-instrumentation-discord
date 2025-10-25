const QRCodeStyling = require("qr-code-styling");
const {JSDOM} = require("jsdom");
const nodeCanvas = require("canvas");

/**
 * This is https://wiki.nottinghack.org.uk/logo/nottinghack_with_white.svg as a png with base64 encoding,
 * to avoid downloading it each time, or needing to add to the docker image.
 */
const nhLogoBase64 = `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
Qqn+Dy1/quiI07SVAAAAAElFTkSuQmCC
`


module.exports =  {
    /**
     * Generate a QR code and return it as a Stream.
     *
     * @param url string
     * @param titleText string
     * @returns {Promise<PNGStream>}
     */
    generateQRCode: async (url, titleText) => {
        // For canvas type
        const qrCode = new QRCodeStyling({
            jsdom: JSDOM, // this is required
            nodeCanvas, // this is required,
            width: 300,
            height: 300,
            shape: 'circle',
            margin: 0,
            dotsOptions: {
                color: "#000000",
                type: "dots"
            },
            backgroundOptions: {
                color: "#ffffff",
            },
            data: url,
            cornersSquareOptions: {
                type: 'dot',
                color: '#195905',
            },
            cornersDotOptions: {
                type: 'dot',
            }
        });

        return qrCode.getRawData('png').then(async (data) => {
            const canvas = nodeCanvas.createCanvas(500, 500)
            const qrImage = await nodeCanvas.loadImage(data)
            const logo60pxImage = await nodeCanvas.loadImage(new Buffer(nhLogoBase64, 'base64'))

            const ctx = canvas.getContext('2d')

            ctx.globalAlpha = 1
            ctx.font = 'normal 40px Impact, sans'
            ctx.fillStyle = '#fff'
            ctx.fillRect(0, 0, 500, 500)

            ctx.fillStyle = '#000'
            ctx.textBaseline = 'middle'
            ctx.textAlign = 'center'
            ctx.fillText("WIKI PAGE", 250, 50)

            ctx.fillStyle = '#195905'
            ctx.fillText((titleText?.length ?? 0) < 20 ? titleText.toUpperCase() : '', 250, 450)

            // add the QR code
            ctx.drawImage(qrImage, 100, 100)

            // add logo to center
            ctx.drawImage(logo60pxImage, (500/2)-(60/2), (500/2)-(60/2), 60, 60)

            return canvas.createPNGStream()
        })
    }
}