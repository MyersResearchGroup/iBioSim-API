import { exec } from "child_process"
import fs from "fs/promises"
import path from "path"
import { log, logSuccess } from "./logger.js"
import { mkdirTough, wasConversionSuccessful } from "./util.js"


export default function convert(inputFile, workingDir) {

    return new Promise(async (resolve, reject) => {

        // create working directory if it doesn't exist
        await mkdirTough(workingDir)

        // create output directory
        const outputDir = path.join(workingDir, 'conversion')
        const dummyFileName = 'output'
        await mkdirTough(outputDir)

        // copy input file over to working dir
        const copiedInputFile = path.join(workingDir, 'input' + path.extname(inputFile))
        await fs.copyFile(inputFile, copiedInputFile)

        // construct command
        const command = `java -jar /iBioSim/conversion/target/iBioSim-conversion-3.1.0-SNAPSHOT-jar-with-dependencies.jar ` +
            `-i -l SBML -p "http://www.async.utah.edu/" -r "https://synbiohub.programmingbiology.org/" ` +
            `-o ${dummyFileName} -oDir ${outputDir} ${copiedInputFile}`

        // execute conversion
        log(`Executing conversion command:\n${command}`, 'grey', 'Conversion')
        exec(
            command,
            async (error, stdout, stderr) => {

                // handle errors from iBioSim
                if (error) {
                    reject({ error, stderr })
                    return
                }

                // search for output file
                const potentialOutputFiles = (await fs.readdir(outputDir)).filter(file => path.extname(file) == '.xml')
                const outputFile = path.join(
                    outputDir,
                    potentialOutputFiles.length ?   // if there's no other output files
                        potentialOutputFiles[0] :   // just send the dummy back
                        dummyFileName
                )
                log(`Sending back file: ${outputFile}`, "grey", "Conversion")

                // handle an invalid output from iBioSim
                if (!await wasConversionSuccessful(outputFile)) {
                    reject({
                        message: "Conversion didn't produce expected output. This could be due to invalid parameters.",
                        stdout
                    })
                    return
                }

                logSuccess("Conversion successful.", "Conversion")
                resolve(outputFile)
            }
        )
    })
}