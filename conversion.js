import { exec } from "child_process"
import os from "os"
import fs from "fs/promises"
import fsSync from "fs"
import path from "path"
import { log } from "./logger.js"
import { mkdirTough, zip } from "./util.js"
import { pipeline } from "stream/promises"


export default function convert(inputFile, {
    workingDir = os.tmpdir(),
    writeOutputFile = false
}) {

    return new Promise(async (resolve, reject) => {

        // create working directory if it doesn't exist
        await mkdirTough(workingDir)

        // create output directory
        const outputDir = path.join(workingDir, 'conversion')
        const outputFileName = 'output.sbol'
        await mkdirTough(outputDir)

        // copy input file over to working dir
        const copiedInputFile = path.join(workingDir, 'input' + path.extname(inputFile))
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

                // find output files
                const potentialOutputFiles = (await fs.readdir(outputDir)).filter(fileName => path.extname(fileName) == '.xml')

                // check if conversion produced anything
                if(!potentialOutputFiles.length) {
                    reject({
                        message: "Conversion didn't produce any SBML files.",
                        stdout
                    })
                    return
                }

                // 1 file produced -- resolve stream to that file
                if(potentialOutputFiles.length == 1) {
                    log("One module produced; resolving to it.", "grey", "Conversion")
                    resolve(fsSync.createReadStream(
                        path.join(outputDir, potentialOutputFiles[0])
                    ))
                    return
                }

                // multiple files produced -- zip and resolve stream to archive
                log("Multiple modules produced; resolving archive.", "grey", "Conversion")

                const archiveStream = zip(outputDir, '*.xml')

                // check if we should write the stream to a file
                if(writeOutputFile) {
                    const writeStream = fsSync.createWriteStream(path.join(outputDir, "conversionOutput.omex"))
                    await pipeline(archiveStream, writeStream)
                    resolve(writeStream)
                    return
                }
                
                // otherwise just resolve the stream
                resolve(archiveStream)
            }
        )
    })
}