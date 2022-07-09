/*

    Asynchronous endpoints -- ideal for longer operations,
    but needs an endpoint to send evens to. Won't be useful
    directly with a browser client, but rather in tandem with
    an orchestrator like Azure Durable Functions.

*/

import os from "os"
import path from "path"

import convert, { ParameterMap as ConversionParameterMap } from "./conversion.js"
import { executeCallback, getBaseFileName, processParameters, zip } from "./util.js"
import analyze, { ParameterMap as AnalysisParameterMap } from "./analysis.js"
import { log, logError, logSuccess } from "./logger.js"


export default function async(app) {

    // POST convert
    app.post('/async/convert', (req, res) => {

        const { sbol } = req.files

        // validate SBOL file exists
        if (!sbol?.path) {
            res.status(500).json({ error: "Must attach an SBOL file with key 'sbol'." })
            return
        }

        // validate there is a callback URL
        if (!req.body?.callback) {
            res.status(500).json({ error: "Must include a callback URL as parameter 'callback'." })
            return
        }

        // create working directory
        const workingDir = path.join(os.tmpdir(), `conversion-${getBaseFileName(sbol.path)}`)
        log(`Active directory: ${workingDir}`, 'yellow', 'Conversion')

        // convert!
        convert(sbol.path, {
            workingDir,
            parameters: processParameters(req.body, ConversionParameterMap),
        })
            .then(conversionOutput => {
                logSuccess("Conversion successful.", "Conversion")

                // attach output stream to callback request
                executeCallback(req.body.callback, 'complete', conversionOutput)
            })
            .catch(error => {
                logError("Error during conversion. See response for details.", 'Conversion')
                executeCallback(req.body.callback, 'error', { error })
            })
            .finally(() => {
                // TO DO: clean up temp files
            })

        res.status(202).json({ message: "Accepted for conversion." })
    })


    // POST analyze
    app.post('/async/analyze', (req, res) => {

        const { input, environment } = req.files

        // validate input file exists
        if (!input?.path) {
            res.status(500).json({ error: "Must attach an SBML, SBOL, or OMEX file with key 'input'." })
            return
        }

        // validate there is a callback URL
        if (!req.body?.callback) {
            res.status(500).json({ error: "Must include a callback URL as parameter 'callback'." })
            return
        }

        // grab unique name we'll use from now on
        const workingDir = path.join(os.tmpdir(), `analysis-${getBaseFileName(input.path)}`)
        log(`Active directory: ${workingDir}`, 'yellow', 'Analysis')

        // analyze!
        analyze(input.path, {
            workingDir,
            parameters: processParameters(req.body, AnalysisParameterMap),
            conversionParameters: processParameters(req.body, ConversionParameterMap),
            environment: environment?.path
        })
            .then(analysisOutput => {
                logSuccess("Analysis successful.", "Analysis")

                // attach output stream to callback request
                executeCallback(req.body.callback, 'complete', analysisOutput)
            })
            .catch(error => {
                logError("Error during analysis. See response for details.", 'Analysis')
                executeCallback(req.body.callback, 'error', { error })
            })
            .finally(() => {
                // TO DO: clean up temp files
            })

        res.status(202).json({ message: "Accepted for analysis." })
    })
}