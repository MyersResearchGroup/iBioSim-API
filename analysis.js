import { exec } from "child_process"
import os from "os"
import { doResultsContainNaN, mkdirTough, Parameter, wasAnalysisSuccessful, zip } from "./util.js"
import fs from "fs/promises"
import fsSync from "fs"
import path from "path"
import convert from "./conversion.js"
import { log, logSuccess, logWarning } from "./logger.js"
import unzipper from "unzipper"
import { pipeline } from "stream/promises"
import readline from "readline"


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
    simulationType: new Parameter('sim', 'lowercaseString'),
    outputAll: new Parameter(null, 'bool')
}


export default function analyze(inputFile, {
    workingDir = os.tmpdir(),
    parameters = {},
    conversionParameters = {},
    environment
}) {

    return new Promise(async (resolve, reject) => {

        // create working directory if it doesn't exist
        await mkdirTough(workingDir)

        // create output directory
        const outputDir = path.join(workingDir, 'outputs')
        await mkdirTough(outputDir)

        // copy input file over to working dir
        const copiedInputFile = path.join(workingDir, 'input' + path.extname(inputFile))
        await fs.copyFile(inputFile, copiedInputFile)

        // extract environment into output dir
        let sedmlFile
        if (environment) {
            await pipeline(
                fsSync.createReadStream(environment),
                unzipper.Extract({ path: outputDir })
            )
            log("Extracted environment.", "grey", "Analysis")

            // search for SEDML file -- has top priority to be used
            // for analysis
            const sedmlFileName = (await fs.readdir(outputDir))
                .find(fileName => path.extname(fileName) == '.sedml')
            sedmlFileName && (sedmlFile = path.join(outputDir, sedmlFileName))
        }

        // determine if file is SBOL
        const isSbol = await new Promise(resolve => {
            const rlInterface = readline.createInterface({
                input: fsSync.createReadStream(inputFile),
                crlfDelay: Infinity,
            })
            rlInterface.on("line", line => {
                if(/<sbol/.test(line)) {
                    resolve(true)
                    rlInterface.close()
                }
            })
            rlInterface.on("close", () => resolve(false))
        })

        // convert input file if it's SBOL
        let convertedFile
        if (isSbol) {
            log('File is SBOL. Converting to SBML.', 'grey', 'Analysis')
            try {
                // convert
                convertedFile = await convert(copiedInputFile, {
                    workingDir,
                    resolveTopModelPath: true,
                    parameters: conversionParameters
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
            ` -outDir ${outputDir} ${sedmlFile || convertedFile || copiedInputFile}`

        // execute analysis
        log(`Executing analysis command:\n${command}`, 'grey', 'Analysis')
        exec(
            command,
            {
                cwd: outputDir
            },
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
                        stdout,
                        stderr
                    })
                    return
                }

                // warn about possible issues
                if (await doResultsContainNaN(outputDir))
                    logWarning("Warning: results contain NaN. This may indicate an invalid model.", "Analysis")

                // zip it up -- optionally only include run files
                resolve(
                    zip(outputDir, {
                        glob: !parameters.outputAll && '*.tsd'
                    })
                )
            }
        )
    })
}