import chalk from "chalk"

chalk['orange'] = chalk.hex('#FFA500')

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

export function logWarning(message, source) {
    log(message, 'orange', source)
}