import { exec } from "child_process"
import { mkdirTough, Parameter, wasAnalysisSuccessful } from "./util.js"
import fs from "fs/promises"
import path from "path"
import convert from "./conversion.js"
import { log, logSuccess } from "./logger.js"


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


export default function analyze(inputFile, outputDir, parameters = {}) {

    return new Promise(async (resolve, reject) => {

        // create output directory if it doesn't exist
        await mkdirTough(outputDir)

        // copy input file over to output dir
        const copiedInputFile = path.join(outputDir, 'input' + path.extname(inputFile))
        await fs.copyFile(inputFile, copiedInputFile)

        // convert input file if it's SBOL
        // TO DO: add smarter detection of SBOL files
        let convertedFile
        if (path.extname(inputFile).toLowerCase() == '.sbol') {
            log('File is SBOL. Converting to SBML.', 'grey', 'Analysis')
            convertedFile = await convert(copiedInputFile, outputDir)
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
                    reject("Analysis didn't produce expected output. This could be due to invalid parameters.")
                    return
                }

                // successful case
                logSuccess("Analysis successful.", "Analysis")
                // console.debug(stdout)
                resolve(outputDir)
            }
        )
    })
}