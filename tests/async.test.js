import { jest } from "@jest/globals"
import { runAsyncTest } from "./util.js"
import testValues from "./valueSets.js"

jest.setTimeout(100000)

test("Single-module SBOL (.sbol) file with parameters", async () => {
    await runAsyncTest(testValues.singleModuleSBOLParams)
})

test("Single-module SBOL (.sbol) file with environment archive", async () => {
    await runAsyncTest(testValues.singleModuleSBOLEnvironment)
})

test("Multi-module SBOL (.sbol) file with parameters", async () => {
    await runAsyncTest(testValues.multiModuleSBOLParams)
})

test("Multi-module SBOL (.sbol) file with environment archive", async () => {
    await runAsyncTest(testValues.multiModuleSBOLEnvironment)
})

test("SBML (.xml) file with parameters", async () => {
    await runAsyncTest(testValues.SBMLParams)
})

test("OMEX archive (.omex)", async () => {
    await runAsyncTest(testValues.OMEX)
})