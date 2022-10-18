
const singleModuleSBOL = "./tests/samples/Repressilator.xml"
const multiModuleSBOL = "./tests/samples/Circuit0x8E.xml"
const sbml = "./tests/samples/SimpleReaction.sbml.xml"
const omex = "./tests/samples/SimpleReaction.omex"

const parameters = {
    runs: 1,
    simulationType: "ssa"
}
const environment = "./tests/samples/SimEnvPepe.omex"

export default {
    singleModuleSBOLParams: callback => [
        { input: singleModuleSBOL },
        callback ? {...parameters, callback } : parameters
    ],
    multiModuleSBOLParams: callback => [
        { input: multiModuleSBOL },
        callback ? {...parameters, callback } : parameters
    ],
    singleModuleSBOLEnvironment: callback => [
        { input: singleModuleSBOL, environment },
        callback ? { callback } : {}
    ],
    multiModuleSBOLEnvironment: callback => [
        { input: multiModuleSBOL, environment },
        callback ? { callback } : {}
    ],
    SBMLParams: callback => [
        { input: sbml },
        callback ? {...parameters, callback } : parameters
    ],
    OMEX: callback => [
        { input: omex },
        callback ? { callback } : {}
    ]
}