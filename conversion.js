import { exec } from "child_process"
import os from "os"
import fs from "fs/promises"
import fsSync from "fs"
import path from "path"
import { log } from "./logger.js"
import { generateMetadata, mkdirTough, Parameter, zip } from "./util.js"


export const ParameterMap = {
    topModelId: new Parameter('tmID', 'string', 'topModel')
}


export default function convert(inputFile, {
    workingDir = os.tmpdir(),
    parameters = {},
    resolveTopModelPath = false
}) {

    return new Promise(async (resolve, reject) => {

        // create working directory if it doesn't exist
        await mkdirTough(workingDir)

        // create output directory
        const outputDir = path.join(workingDir, 'outputs')
        const outputFileName = 'output_sbol.xml'
        await mkdirTough(outputDir)

        // copy input file over to working dir
        const copiedInputFile = path.join(workingDir, 'input' + path.extname(inputFile))
        await fs.copyFile(inputFile, copiedInputFile)

        // flatten parameters down to string for command line
        const paramString = Object.entries(parameters)
            .filter(([key]) => !!ParameterMap[key]?.commandFlag)
            .map(
                ([key, val]) => `-${ParameterMap[key]?.commandFlag} ${val}`
            )
            .join(' ')

        // construct command
        const command = `java -jar /iBioSim/conversion/target/iBioSim-conversion-3.1.0-SNAPSHOT-jar-with-dependencies.jar ` +
            `-i -l SBML -p "http://www.async.utah.edu/" -r "https://synbiohub.programmingbiology.org/" ` +
            `${paramString} -o ${outputFileName} -oDir ${outputDir} ${copiedInputFile}`

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
                const producedOutputFiles = (await fs.readdir(outputDir))
                    .filter(fileName => fileName != outputFileName)

                // check if conversion produced anything
                if (!producedOutputFiles.length) {
                    reject({
                        message: "Conversion didn't produce any SBML files.",
                        stdout
                    })
                    return
                }

                // 1 file produced -- resolve stream to that file
                if (producedOutputFiles.length == 1) {
                    log("One module produced; resolving to it.", "grey", "Conversion")
                    const fileToResolve = path.join(outputDir, producedOutputFiles[0])

                    resolve(
                        // either resolve just the path or a stream to it
                        resolveTopModelPath ?
                            fileToResolve :
                            fsSync.createReadStream(fileToResolve)
                    )
                    return
                }

                // multiple files produced
                log("Multiple modules produced; resolving archive.", "grey", "Conversion")

                // if this option is set, just resolve a path to *_topModule.xml
                if (resolveTopModelPath) {
                    resolve(path.join(
                        outputDir,
                        producedOutputFiles.find(fileName => fileName == `${parameters.topModelId}.xml`) ||
                        producedOutputFiles.find(fileName => fileName.endsWith('_topModule.xml'))
                    ))
                    return
                }

                // otherwise, zip and resolve a stream to the archive
                const archiveStream = zip(outputDir, {
                    glob: '*.xml',
                    finalize: false     // wait to finalize until we append the manifest
                })

                // generate metadata for COMBINE archive
                const { manifest, metadata } = generateMetadata(producedOutputFiles)
                archiveStream.append(manifest, { name: 'manifest.xml' })
                archiveStream.append(metadata, { name: 'metadata.rdf' })

                // finalize archive
                archiveStream.finalize()

                // resolve the stream
                resolve(archiveStream)
            }
        )
    })
}