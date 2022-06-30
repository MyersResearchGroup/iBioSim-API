import fs from "fs/promises"
import fsSync from "fs"
import path from "path"
import archiver from "archiver"
import fetch from "node-fetch"
import { log } from "./logger.js"


/*
    File handling
*/

export async function pathExists(testPath) {
    try {
        await fs.access(testPath)
        return true
    } catch {
        return false
    }
}

export async function mkdirTough(dir) {
    if (!await pathExists(dir))
        await fs.mkdir(dir)
}

export function getBaseFileName(fileName) {
    return path.basename(fileName).match(/(.+?)(\.[^.]*$|$)/)?.[1]
}


/*
    Parameter handling
*/

const ParserMap = {
    'float': parseFloat,
    'integer': parseInt,
    'string': str => str.toLowerCase(),
    'bool': str => str === 'true'
}

export class Parameter {
    constructor(commandFlag, type = 'float', extraProcessor) {
        this.commandFlag = commandFlag

        this.process = paramVal => {
            let result = ParserMap[type]?.(paramVal) ?? paramVal
            return extraProcessor?.(result) ?? result
        }
    }
}

export function processParameters(requestBody, parameterMap) {
    return Object.fromEntries(
        Object.entries(requestBody)
            .map(
                ([key, val]) => parameterMap[key] && [
                    key,
                    parameterMap[key].process(val)
                ]
            )
            .filter(entry => !!entry)
    )
}


/*
    Zipping & Archiving
*/

export function zip(dir, { glob, finalize = true }) {
    const archive = archiver('zip', {
        zlib: { level: 9 }  // compression level
    })

    // error handling
    archive.on('error', err => { throw err })

    // append files
    glob ?
        archive.glob(glob, { cwd: dir }) :
        archive.directory(dir, false)

    finalize && archive.finalize()
    return archive
}

export function generateMetadata(sbmlFileNames) {
    return {
        manifest: `<?xml version="1.0" encoding="UTF-8"?>
<omexManifest xmlns="http://identifiers.org/combine.specifications/omex-manifest">
    <content location="." format="http://identifiers.org/combine.specifications/omex" />
    <content location="./manifest.xml" format="http://identifiers.org/combine.specifications/omex-manifest" />
    <content location="./metadata.rdf" format="http://identifiers.org/combine.specifications/omex-metadata" />
${sbmlFileNames.map(fileName =>
            `    <content location="./${fileName}" format="http://identifiers.org/combine.specifications/sbml.level-3.version-2.core" />`
        ).join('\n')}
</omexManifest>`,
        metadata: `<?xml version="1.0" encoding="UTF-8"?>
<rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:vCard="http://www.w3.org/2006/vcard/ns#" />
        `
    }
}


/*
    Verification
*/

export async function wasAnalysisSuccessful(analysisDir) {
    // iBioSim doesn't report as many errors as it should,
    // so we're gonna check if it actually produced something
    return await pathExists(path.join(analysisDir, 'statistics.txt'))
}

export function wasConversionSuccessful(convertedFile) {
    // iBioSim doesn't report as many errors as it should,
    // so we're gonna check if the converted file contains
    // SBML tags
    const stream = fsSync.createReadStream(convertedFile)

    return new Promise((resolve, reject) => {

        // search data for SBML tag
        stream.on('data', chunk => {
            if (('' + chunk).includes('<sbml')) {
                resolve(true)
                stream.destroy()    // end stream if found
            }
        })

        // reject if we reach the end of the stream
        stream.on('end', () => resolve(false))

        // error handling
        stream.on('error', err => reject(err))
    })
}

export function doResultsContainNaN(analysisDir) {
    // if an analysis completed but the input model
    // wasn't quite right, it may produce a lot of NaNs
    // in the output.
    const stream = fsSync.createReadStream(path.join(analysisDir, 'run-1.tsd'))

    return new Promise((resolve, reject) => {

        // search data for NaN values
        stream.on('data', chunk => {
            if (('' + chunk).toLowerCase().includes('nan')) {
                resolve(true)
                stream.destroy()    // end stream if found
            }
        })

        // reject if we reach the end of the stream
        stream.on('end', () => resolve(false))

        // error handling
        stream.on('error', err => reject(err))
    })
}


/*
    Async handling
*/

export function executeCallback(callbackUrlTemplate, event, payload) {
    return fetch(
        callbackUrlTemplate.replace("{event}", event),
        {
            method: 'POST',
            body: payload
        }
    )
    .catch(error => {
        log("Error attempting to hit callback:", "red", "Async")
        log(error, "grey")
    })
}