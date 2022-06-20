import fs from "fs/promises"
import path from "path"
import archiver from "archiver"

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
    Zipping
*/

export function zip(dir, glob) {
    const archive = archiver('zip', {
        zlib: { level: 9 }  // compression level
    })

    // error handling
    archive.on('error', err => { throw err })

    // append files
    glob ?
        archive.glob(glob, { cwd: dir }) :
        archive.directory(dir, false)

    archive.finalize()
    return archive
}


/*
    Verification
*/

export async function wasAnalysisSuccessful(analysisDir) {
    // iBioSim doesn't report as many errors as it should,
    // so we're gonna check if it actually produced something
    return await pathExists(path.join(analysisDir, 'statistics.txt'))
}