import os from "os"
import path from "path"
import express from "express"
import formData from "express-form-data"
import morgan from "morgan"

import { log } from "./logger.js"
import sync from "./sync.js"


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


// Synchronous endpoints
//      POST convert
//      POST analyze
sync(app)


// Make server listen
const PORT = 4000
app.listen(PORT, () => {
    log(`Listening on port ${PORT}`, 'blue', 'Express')
})