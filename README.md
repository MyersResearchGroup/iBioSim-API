
# iBioSim API

An API for the Java-based synthetic biology simulation tool, iBioSim.

## Motivation

iBioSim was only previously accessible via the command line or a Java desktop app.
The goal is to make the tool accessible via a webapp.
## Note about synchronous vs. asynchronous endpoints

### ⏱ Syncronous endpoints

Synchronous endpoints complete the entire operation before responding with a `200` status (unless an error is encountered, resulting in a `500`).

Note that these operations can be long-running depending on the parameters (>30 sec). If this is a problem, use asynchronous endpoints.

### 📞 Asyncronous endpoints

Asynchronous endpoints respond immediately with a `202` status (unless invalid parameters are provided, resulting in a `500`).

These requests **require the `callback` parameter**, which must be a URL to which the server can post the results of the operation.
The callback URL must be of the following form:

`http://host.com/this/part/doesnt/matter/{event}`

**including `{event}` with the curly braces**. The API will replace `{event}` with either `complete` or `error` depending on the result.

For testing, try using [Beeceptor](https://beeceptor.com/) to setup a mock callback server.

## API Reference

**Important:** All parameters are should be provided in the **body** of the request as **`multipart/form-data`**.

### Convert SBOL to SBML

⏱ `POST /sync/convert`

📞 `POST /async/convert`

| Parameter | Type     | Description                       |
| :-------- | :------- | :-------------------------------- |
| **`sbol`**  | **`file`**   | **SBOL file to convert (.sbol or .xml)**|
| `topModelId`| `string` | Default: topModel<br />What to name the top model file in the case of multiple output files. |
| 📞 `callback` | `URL`     | Callback URL

### Run analysis

⏱ `POST /sync/analyze`

📞 `POST /async/analyze`

Runs an analysis on the uploaded design. The request must satisfy one of the following cases:
- SBOL file (.sbol or .xml) with parameters
- SBOL file (.sbol or .xml) with an environment archive
- SBML file (.xml) with parameters
- SBML file (.xml) with an environment archive
- OMEX archive (.omex)

Providing an environment archive and parameters is an undefined case and may produce unexpected results.

| Parameter | Type     | Description                       |
| :-------- | :------- | :-------------------------------- |
| **`input`**  | **`file`**   | **SBOL (.sbol or .xml), SBML (.xml), or OMEX (.omex) file to run analysis on.**|
| `environment`  | `file`   | Environment archive |
| `topModelId`| `string` | Default: topModel<br />What to name the top model file in the case of multiple output files. Only valid for SBOL files. |
| `simulationType` | `string` | Type of simulation to conduct. Valid options are `ode`, `hode`, `ssa`, `hssa`, `dfba`, `jode`, and `jssa`. |
| `runs` | `integer` | Number of runs to simulate. |
| `initialTime` | `integer` | Start time for the simulation |
| `stopTime` | `integer` | Stop time for the simulation |
| `outputTime` | `integer` | Time at which the simulation begins outputting data |
| `printInterval` | `integer` | Time interval between outputs |
| `minTimeStep` | `integer` | Minimum time step |
| `maxTimeStep` | `integer` | Maximum time step |
| `seed` | `integer` | Seed used for pseudorandomness in simulation |
| `outputAll` | `boolean` | Default: false<br />Whether to output all produced files, or just run data |
| 📞 `callback` | `URL`     | Callback URL



## Run Locally

Although this is a fairly simple Express app, it's easier to run containerized because of the dependency on iBioSim.

Clone the project

```bash
git clone https://github.com/zachsents/iBioSim-API
```

Go to the project directory

```bash
cd iBioSim-API
```

Build the image

```bash
docker build -t ibiosim-api .
```

Start the container

```bash
docker run -p 4000:4000 -it ibiosim-api
```

The app will be exposed at http://localhost:4000.
