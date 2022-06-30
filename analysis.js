import { exec } from "child_process"
import os from "os"
import { doResultsContainNaN, mkdirTough, Parameter, wasAnalysisSuccessful, zip } from "./util.js"
import fs from "fs/promises"
import fsSync from "fs"
import path from "path"
import convert from "./conversion.js"
import { log, logSuccess, logWarning } from "./logger.js"
import { pipeline } from "stream/promises"


export const ParameterMap = {
    initialTime: new Parameter('ti', 'integer'),
    stopTime: new Parameter('tl', 'integer'),
    outputTime: new Parameter('ot', 'integer'),
    printInterval: new Parameter('pi', 'integer'),
    minTimeStep: new Parameter('m0', 'integer'),
    maxTimeStep: new Parameter('m1', 'integer'),
    absoluteError: new Parameter('aErr', 'float'),
    relativeError: new Parameter('sErr', 'float'),
    seed: new Parameter('sd', 'integer'),
    runs: new Parameter('r', 'integer'),
    simulationType: new Parameter('sim', 'string'),
    outputAll: new Parameter(null, 'bool')
}


export default function analyze(inputFile, {
    workingDir = os.tmpdir(),
    parameters = {},
}) {

    return new Promise(async (resolve, reject) => {

        // create working directory if it doesn't exist
        await mkdirTough(workingDir)

        // create output directory
        const outputDir = path.join(workingDir, 'outputs')
        await mkdirTough(outputDir)

        // copy input file over to working dir
        // TO DO: change .sbml files to .xml. iBioSim doesn't like .sbml files
        const copiedInputFile = path.join(workingDir, 'input' + path.extname(inputFile))
        await fs.copyFile(inputFile, copiedInputFile)

        // convert input file if it's SBOL
        // TO DO: add smarter detection of SBOL files
        let convertedFile
        if (path.extname(inputFile).toLowerCase() == '.sbol') {
            log('File is SBOL. Converting to SBML.', 'grey', 'Analysis')
            try {
                // convert
                convertedFile = await convert(copiedInputFile, {
                    workingDir,
                    resolveTopModulePath: true
                })
            }
            catch (err) {
                reject(err)
                return
            }
        }

        // flatten parameters down to string for command line
        const paramString = Object.entries(parameters)
            .filter(([key]) => !!ParameterMap[key]?.commandFlag)
            .map(
                ([key, val]) => `-${ParameterMap[key]?.commandFlag} ${val}`
            )
            .join(' ')

        // construct command
        const command = `java -jar /iBioSim/analysis/target/iBioSim-analysis-3.1.0-SNAPSHOT-jar-with-dependencies.jar ` +
            paramString +
            ` -outDir ${outputDir} ${convertedFile || copiedInputFile}`

        // execute analysis
        log(`Executing analysis command:\n${command}`, 'grey', 'Analysis')
        exec(
            command,
            async (error, stdout, stderr) => {

                // handle errors from iBioSim
                if (error) {
                    reject({ error, stderr })
                    return
                }

                // handle an invalid output from iBioSim
                if (!await wasAnalysisSuccessful(outputDir)) {
                    reject({
                        message: "Analysis didn't produce expected output. This could be due to invalid parameters.",
                        stdout
                    })
                    return
                }

                // warn about possible issues
                if (await doResultsContainNaN(outputDir))
                    logWarning("Warning: results contain NaN. This may indicate an invalid model.", "Analysis")

                // zip it up -- optionally only include run files
                resolve(
                    zip(outputDir, {
                        glob: !parameters.outputAll && 'run-*.tsd'
                    })
                )
            }
        )
    })
}