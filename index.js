import os from "os"
import fsSync from "fs"
import path from "path"
import express from "express"
import formData from "express-form-data"
import morgan from "morgan"

import convert from "./conversion.js"
import { getBaseFileName, processParameters, zip } from "./util.js"
import analyze, { ParameterMap as AnalysisParameterMap } from "./analysis.js"
import { log, logError } from "./logger.js"


// Set up server
const app = express()

// Attach middleware
app.use(formData.parse({            // parse data with connect-multiparty. 
    uploadDir: path.join(os.tmpdir(), 'uploads'),
    // autoClean: true
}))
app.use(formData.format())          // delete from the request all empty files (size == 0)
// app.use(formData.stream())          // change the file objects to fs.ReadStream 
app.use(formData.union())           // union the body and the files
app.use(morgan('tiny'))             // logging 
app.use((req, res, next) => { console.log('\n\n'); next() })  // add a few line breaks after each request


// GET status
app.get('/status', (req, res) => {
    res.json({
        message: "iBioSim Server is up and running!"
    })
})


// POST convert
app.post('/sync/convert', async (req, res) => {

    const { sbol, archive } = req.files

    // validate SBOL file exists
    if (!sbol?.path)
        res.json({ error: "Must attach an SBOL file with key 'sbol'." })

    // grab unique name we'll use from now on
    const unique = `conversion-${getBaseFileName(sbol.path)}`
    log(`Active directory: ${unique}`, 'yellow', 'Conversion')

    try {
        // convert -- short running, we'll await it
        const conversionOutput = await convert(
            sbol.path,
            path.join(os.tmpdir(), unique)
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

    const { sbml, archive } = req.files

    // validate SBML file exists
    if (!sbml)
        res.json({ error: "Must attach an SBML file with key 'sbml'." })

    // grab unique name we'll use from now on
    const unique = `analysis-${getBaseFileName(sbml.path)}`
    log(`Active directory: ${unique}`, 'yellow', 'Analysis')

    try {
        // analyze
        const analysisParameters = processParameters(req.body, AnalysisParameterMap)
        const analysisOutput = await analyze(
            sbml.path,
            path.join(os.tmpdir(), unique),
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


// Make server listen
const PORT = 4000
app.listen(PORT, () => {
    log(`Listening on port ${PORT}`, 'blue', 'Express')
})