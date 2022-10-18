import { jest } from "@jest/globals"
import { runSyncTest } from "./util.js"
import testValues from "./valueSets.js"

jest.setTimeout(100000)

test("Single-module SBOL (.xml) file with parameters", async () => {
    await runSyncTest(testValues.singleModuleSBOLParams)
})

test("Single-module SBOL (.xml) file with environment archive", async () => {
    await runSyncTest(testValues.singleModuleSBOLEnvironment)
})

test("Multi-module SBOL (.xml) file with parameters", async () => {
    await runSyncTest(testValues.multiModuleSBOLParams)
})

test("Multi-module SBOL (.xml) file with environment archive", async () => {
    await runSyncTest(testValues.multiModuleSBOLEnvironment)
})

test("SBML (.xml) file with parameters", async () => {
    await runSyncTest(testValues.SBMLParams)
})

test("OMEX archive (.omex)", async () => {
    await runSyncTest(testValues.OMEX)
})
