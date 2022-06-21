import { exec } from "child_process"
import fs from "fs/promises"
import path from "path"
import { log, logSuccess } from "./logger.js"
import { mkdirTough, wasConversionSuccessful } from "./util.js"


export default function convert(inputFile, outputDir) {

    return new Promise(async (resolve, reject) => {

        // create output directory if it doesn't exist
        await mkdirTough(outputDir)

        const outputFileName = 'module1.xml'

        // copy input file over to output dir
        const copiedInputFile = path.join(outputDir, 'input' + path.extname(inputFile))
        await fs.copyFile(inputFile, copiedInputFile)

        // construct command
        const command = `java -jar /iBioSim/conversion/target/iBioSim-conversion-3.1.0-SNAPSHOT-jar-with-dependencies.jar ` +
            `-i -l SBML -p "http://www.async.utah.edu/" -r "https://synbiohub.programmingbiology.org/" ` +
            `-o ${outputFileName} -oDir ${outputDir} ${copiedInputFile}`

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

                const outputFile = path.join(outputDir, outputFileName)

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