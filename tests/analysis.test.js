import fetch from "node-fetch"
import fsSync from "fs"
import unzipper from "unzipper"
import FormData from "form-data"
import { jest } from "@jest/globals"

jest.setTimeout(600000)

test("Single-module SBOL (.sbol) file with parameters", async () => {

    // execute request
    const response = await sendRequest("sync/analyze", {
        input: "./tests/samples/Repressilator.sbol"
    }, {
        runs: 1,
        simulationType: "ssa"
    })

    // check if response is good
    expect(response.ok).toBeTruthy()

    // check if response contains TSD files
    await expect(responseContainsTSD(response)).resolves.toBeTruthy()
})

test("Single-module SBOL (.sbol) file with environment archive", async () => {

    // execute request
    const response = await sendRequest("sync/analyze", {
        input: "./tests/samples/Repressilator.sbol",
        environment: "./tests/samples/SimEnvPepe.omex"
    }, {
        // simulationType: "ssa"
    })

    // check if response is good
    expect(response.ok).toBeTruthy()

    // check if response contains TSD files
    await expect(responseContainsTSD(response)).resolves.toBeTruthy()
})

test("Multi-module SBOL (.sbol) file with parameters", async () => {

    // execute request
    const response = await sendRequest("sync/analyze", {
        input: "./tests/samples/Circuit0x8E.sbol"
    }, {
        runs: 1,
        simulationType: "ssa"
    })

    // check if response is good
    expect(response.ok).toBeTruthy()

    // check if response contains TSD files
    await expect(responseContainsTSD(response)).resolves.toBeTruthy()
})

test("Multi-module SBOL (.sbol) file with environment archive", async () => {

    // execute request
    const response = await sendRequest("sync/analyze", {
        input: "./tests/samples/Circuit0x8E.sbol",
        environment: "./tests/samples/SimEnvPepe.omex"
    }, {
        // simulationType: "ssa"
    })

    // check if response is good
    expect(response.ok).toBeTruthy()

    // check if response contains TSD files
    await expect(responseContainsTSD(response)).resolves.toBeTruthy()
})

test("SBML (.xml) file with parameters", async () => {

    // execute request
    const response = await sendRequest("sync/analyze", {
        input: "./tests/samples/SimpleReaction.sbml.xml"
    }, {
        runs: 1,
        simulationType: "ssa"
    })

    // check if response is good
    expect(response.ok).toBeTruthy()

    // check if response contains TSD files
    await expect(responseContainsTSD(response)).resolves.toBeTruthy()
})

test("OMEX archive (.omex)", async () => {

    // execute request
    const response = await sendRequest("sync/analyze", {
        input: "./tests/samples/SimpleReaction.omex"
    })

    // check if response is good
    expect(response.ok).toBeTruthy()

    // check if response contains TSD files
    await expect(responseContainsTSD(response)).resolves.toBeTruthy()
})


async function responseContainsTSD(response) {
    // unzip
    const zipContents = response.body.pipe(unzipper.Parse({ forceStream: true }))

    // loop through contents and set flag if any of them are TSD files
    let containsTSD = false
    for await (const entry of zipContents) {
        entry.path.includes(".tsd") && (containsTSD = true)
        entry.autodrain()
    }
    return containsTSD
}


async function sendRequest(endpoint, files = {}, params = {}) {
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