import fetch from "node-fetch"
import fsSync from "fs"
import unzipper from "unzipper"
import FormData from "form-data"
import express from "express"
import { Readable } from "stream"


export async function runSyncTest(valueSet) {

    // execute request
    const response = await sendRequest("sync/analyze", ...valueSet())

    // check if response is good
    expect(response.ok).toBeTruthy()

    // check if response contains TSD files
    await expect(responseContainsTSD(response.body)).resolves.toBeTruthy()
}


export async function runAsyncTest(valueSet) {
    const mockServer = await setupMockServer(4001)

    // execute request
    const response = await sendRequest("async/analyze", ...valueSet(mockServer.callback))

    // check if response is good
    expect(response.status).toBe(202)

    // wait for response to come in
    const callbackRequest = await mockServer.callbackRequested

    // close mock server
    await mockServer.stop()

    // check if response contains TSD files
    await expect(responseContainsTSD(Readable.from(callbackRequest.body)))
        .resolves.toBeTruthy()
}


export function setupMockServer(port) {

    return new Promise((resolve, reject) => {

        const app = express()

        // app.use(express.raw({ type: '*/*' }))
        app.use(express.raw({ limit: "2mb" }))

        // setup Promise for when a request comes in
        const callbackRequested = new Promise((resolve, reject) => {

            // accept requests on all paths
            app.post("/*", (req, res) => {
                resolve(req)
                res.status(200).send('All good')
            })
        })

        // listen on specified port
        const server = app.listen(port, () => {

            // once server is up, resolve details
            resolve({
                callback: `http://localhost:${port}/{event}`,
                callbackRequested,

                // attach a function to stop server 
                stop: () => new Promise((resolve, reject) => {
                    server.close((err) => err ? reject(err) : resolve())
                })
            })
        })
    })
}


export async function responseContainsTSD(bodyStream) {
    // unzip
    const zipContents = bodyStream.pipe(unzipper.Parse({ forceStream: true }))

    // loop through contents and set flag if any of them are TSD files
    let containsTSD = false
    for await (const entry of zipContents) {
        entry.path.includes(".tsd") && (containsTSD = true)
        entry.autodrain()
    }
    return containsTSD
}


export async function sendRequest(endpoint, files = {}, params = {}) {
    // form request
    var formData = new FormData()

    // append files
    Object.entries(files).forEach(
        ([key, path]) => formData.append(
            key,
            fsSync.createReadStream(path)
        )
    )

    // append parameters
    Object.entries(params).forEach(
        ([key, value]) => formData.append(key, value)
    )

    var requestOptions = {
        method: "POST",
        body: formData,
        redirect: "follow"
    }

    // execute request
    return await fetch(`http://localhost:4000/${endpoint}`, requestOptions)
}