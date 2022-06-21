/*

    Synchronous endpoints -- not ideal for longer operations,
    but platform agnostic. Fork coming in the future for an
    asynchronous polling consumer solution for Azure.

*/

import os from "os"
import fsSync from "fs"
import path from "path"

import convert from "./conversion.js"
import { getBaseFileName, processParameters, zip } from "./util.js"
import analyze, { ParameterMap as AnalysisParameterMap } from "./analysis.js"
import { log, logError } from "./logger.js"


export default function sync(app) {
    
    // POST convert
    app.post('/sync/convert', async (req, res) => {

        const { sbol, archive } = req.files

        // validate SBOL file exists
        if (!sbol?.path)
            res.json({ error: "Must attach an SBOL file with key 'sbol'." })

        // create working directory
        const workingDir = path.join(os.tmpdir(), `conversion-${getBaseFileName(sbol.path)}`)
        log(`Active directory: ${workingDir}`, 'yellow', 'Conversion')

        try {
            // convert -- short running, we'll await it
            const conversionOutput = await convert(
                sbol.path,
                workingDir
            )

            // pipe file to response
            fsSync.createReadStream(conversionOutput).pipe(res)
        }
        catch (error) {
            logError("Error during conversion. See response for details.", 'Conversion')
            res.status(500).json({ error })
        }
        finally {
            // TO DO: clean up temp files
        }
    })


    // POST analyze
    app.post('/sync/analyze', async (req, res) => {

        const { input, archive } = req.files

        // validate SBML file exists
        if (!input)
            res.json({ error: "Must attach an SBML file with key 'sbml'." })

        // grab unique name we'll use from now on
        const workingDir = path.join(os.tmpdir(), `analysis-${getBaseFileName(input.path)}`)
        log(`Active directory: ${workingDir}`, 'yellow', 'Analysis')

        try {
            // analyze
            const analysisParameters = processParameters(req.body, AnalysisParameterMap)
            const analysisOutput = await analyze(
                input.path,
                workingDir,
                analysisParameters
            )

            // zip it up and send it off -- optionally only include run files
            zip(
                analysisOutput,
                !analysisParameters.outputAll && 'run-*.tsd'
            ).pipe(res)
        }
        catch (error) {
            logError("Error during analysis. See response for details.", 'Analysis')
            res.status(500).json({ error })
        }
        finally {
            // TO DO: clean up temp files
        }
    })
}