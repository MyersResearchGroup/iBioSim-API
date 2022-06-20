import chalk from "chalk";

export function log(message, color, source) {
    const prefix = source ? `${chalk.bold(`[${source}]`)} ` : `\t`
    console.log(
        (chalk[color]?.(prefix + message) ?? prefix + message)
    )
}

export function logSuccess(message, source) {
    log(message, 'green', source)
}

export function logError(message, source) {
    log(message, 'red', source)
}