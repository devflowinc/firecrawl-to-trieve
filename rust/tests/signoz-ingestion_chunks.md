Chunk 1:
## Javascript OpenTelemetry Instrumentation

This document contains OpenTelemetry instrumentation instructions for Javascript backend frameworks and modules based on Nodejs. If you're using self-hosted SigNoz refer to this  section . If you're using SigNoz cloud, refer to this  section . 

#send-traces-to-signoz-cloud Send traces to SigNoz Cloud------------------------------------------------------------ 

Based on your application environment, you can choose the setup below to send traces to SigNoz Cloud. 

VMKubernetesWindows 

From VMs, there are two ways to send data to SigNoz Cloud. 

- 
Send traces directly to SigNoz Cloud 

  - No Code Automatic Instrumentation (recommended)
  - Code Level Automatic Instrumentation
- 
Send traces via OTel Collector binary  (recommended) 

  - No Code Automatic Instrumentation (recommended)
  - Code Level Automatic Instrumentation
--------------------------------------------------------------------------------
Chunk 2:
#### #send-traces-directly-to-signoz-cloud---no-code-automatic-instrumentation-recommended Send traces directly to SigNoz Cloud - No Code Automatic Instrumentation (recommended)

Step 1.  Install OpenTelemetry packages 
```
npm install --save @opentelemetry/api
npm install --save @opentelemetry/auto-instrumentations-node
```

Step 2.  Run the application 
```
export OTEL_TRACES_EXPORTER=\"otlp\"
export OTEL_EXPORTER_OTLP_ENDPOINT=\"<SIGNOZ_ENDPOINT>\"
export OTEL_NODE_RESOURCE_DETECTORS=\"env,host,os\"
export OTEL_SERVICE_NAME=\"<APP_NAME>\"
export OTEL_EXPORTER_OTLP_HEADERS=\"signoz-access-token=<SIGNOZ_ACCESS_TOKEN>\"
export NODE_OPTIONS=\"--require @opentelemetry/auto-instrumentations-node/register\"
<your_run_command>
```

| Variable | Description |  | --- | --- |  | APP \ _ NAME  \ *  | Name you want to give to your rust application |  | SIGNOZ \ _ ENDPOINT  \ *  | This is ingestion URL which you must have got in mail after registering on SigNoz cloud |  | SIGNOZ \ _ ACCESS \ _ TOKEN  \ *  | This is Ingestion Key which you must have got in mail after registering on SigNoz cloud | 

replace  `<your_run_command>` with the run command of your application
--------------------------------------------------------------------------------
Chunk 3:
#### #send-traces-directly-to-signoz-cloud---code-level-automatic-instrumentation Send traces directly to SigNoz Cloud - Code Level Automatic Instrumentation

Step 1.  Install OpenTelemetry packages 
```
npm install --save @opentelemetry/api@^1.6.0
npm install --save @opentelemetry/sdk-node@^0.45.0
npm install --save @opentelemetry/auto-instrumentations-node@^0.39.4
npm install --save @opentelemetry/exporter-trace-otlp-http@^0.45.0
```

Step 2.  Create tracing.js file 

You need to configure the endpoint for SigNoz cloud in this file. You can find your ingestion key from SigNoz cloud account details sent on your email. 
```
// tracing.js
'use strict'
const process = require('process')
const opentelemetry = require('@opentelemetry/sdk-node')
const { getNodeAutoInstrumentations } = require('@opentelemetry/auto-instrumentations-node')
const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-http')
const { Resource } = require('@opentelemetry/resources')
const { SemanticResourceAttributes } = require('@opentelemetry/semantic-conventions')

// do not set headers in exporterOptions, the OTel spec recommends setting headers through ENV variables
// https://github.com/open-telemetry/opentelemetry-specification/blob/main/specification/protocol/exporter.md#specifying-headers-via-environment-variables

// highlight-start
const exporterOptions = {
  url: 'https://ingest.{region}.signoz.cloud:443/v1/traces',
}
// highlight-end

const traceExporter = new OTLPTraceExporter(exporterOptions)
const sdk = new opentelemetry.NodeSDK({
  traceExporter,
  instrumentations: [getNodeAutoInstrumentations()],
  resource: new Resource({
    // highlight-next-line
    [SemanticResourceAttributes.SERVICE_NAME]: 'node_app',
  }),
})

// initialize the SDK and register with the OpenTelemetry API
// this enables the API to record telemetry
sdk.start()

// gracefully shut down the SDK on process exit
process.on('SIGTERM', () => {
  sdk
    .shutdown()
    .then(() => console.log('Tracing terminated'))
    .catch((error) => console.log('Error terminating tracing', error))
    .finally(() => process.exit(0))
})
```

Depending on the choice of your region for SigNoz cloud, the ingest endpoint will vary according to this table. 

| Region | Endpoint |  | --- | --- |  | US  | ingest.us.signoz.cloud:443/v1/traces |  | IN  | ingest.in.signoz.cloud:443/v1/traces |  | EU  | ingest.eu.signoz.cloud:443/v1/traces | 

Step 3.  Run the application 

Make sure you set the  `OTEL_EXPORTER_OTLP_HEADERS` env as follows 
```
OTEL_EXPORTER_OTLP_HEADERS=\"signoz-access-token=<SIGNOZ_INGESTION_KEY>\" node -r ./tracing.js app.js
```

`SIGNOZ_INGESTION_KEY` is the API token provided by SigNoz. You can find your ingestion key from SigNoz cloud account details sent on your email. 

Step 4.  You can validate if your application is sending traces to SigNoz cloud  here . 

In case you encounter an issue where all applications do not get listed in the services section then please refer to the  troubleshooting section .
--------------------------------------------------------------------------------
Chunk 4:
#### #send-traces-via-otel-collector-binary---no-code-automatic-instrumentation Send traces via OTel Collector binary - No Code Automatic Instrumentation

OTel Collector binary helps to collect logs, hostmetrics, resource and infra attributes. It is recommended to install Otel Collector binary to collect and send traces to SigNoz cloud. You can correlate signals and have rich contextual data through this way. 

\ud83d\udcdd Note 

You can find instructions to install OTel Collector binary  here  in your VM. Once you are done setting up your OTel Collector binary, you can follow the below steps for instrumenting your Javascript application.
--------------------------------------------------------------------------------
Chunk 5:
#### #send-traces-directly-to-signoz-cloud---no-code-automatic-instrumentation-recommended-1 Send traces directly to SigNoz Cloud - No Code Automatic Instrumentation (recommended)

Step 1.  Install OpenTelemetry packages 
```
npm install --save @opentelemetry/api
npm install --save @opentelemetry/auto-instrumentations-node
```

Step 2.  Run the application 
```
export OTEL_TRACES_EXPORTER=\"otlp\"
export OTEL_EXPORTER_OTLP_ENDPOINT=\"http://localhost:4318/v1/traces\"
export OTEL_NODE_RESOURCE_DETECTORS=\"env,host,os\"
export OTEL_SERVICE_NAME=\"<APP_NAME>\"
export NODE_OPTIONS=\"--require @opentelemetry/auto-instrumentations-node/register\"
<your_run_command>
```

| Variable | Description |  | --- | --- |  | APP \ _ NAME  \ *  | Name you want to give to your rust application | 

replace  `<your_run_command>` with the run command of your application
--------------------------------------------------------------------------------
Chunk 6:
#### #send-traces-via-otel-collector-binary---code-level-automatic-instrumentation Send traces via OTel Collector binary - Code Level Automatic Instrumentation

OTel Collector binary helps to collect logs, hostmetrics, resource and infra attributes. It is recommended to install Otel Collector binary to collect and send traces to SigNoz cloud. You can correlate signals and have rich contextual data through this way. 

\ud83d\udcdd Note 

You can find instructions to install OTel Collector binary  here  in your VM. Once you are done setting up your OTel Collector binary, you can follow the below steps for instrumenting your Javascript application. 

Step 1.  Install OpenTelemetry packages 
```
npm install --save @opentelemetry/api@^1.6.0
npm install --save @opentelemetry/sdk-node@^0.45.0
npm install --save @opentelemetry/auto-instrumentations-node@^0.39.4
npm install --save @opentelemetry/exporter-trace-otlp-http@^0.45.0
```

Step 2.  Create tracing.js file 
```
// tracing.js
'use strict'
const process = require('process')
const opentelemetry = require('@opentelemetry/sdk-node')
const { getNodeAutoInstrumentations } = require('@opentelemetry/auto-instrumentations-node')
const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-http')
const { Resource } = require('@opentelemetry/resources')
const { SemanticResourceAttributes } = require('@opentelemetry/semantic-conventions')

const exporterOptions = {
  url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318/v1/traces',
}

const traceExporter = new OTLPTraceExporter(exporterOptions)
const sdk = new opentelemetry.NodeSDK({
  traceExporter,
  instrumentations: [getNodeAutoInstrumentations()],
  resource: new Resource({
    // highlight-next-line
    [SemanticResourceAttributes.SERVICE_NAME]: 'node_app',
  }),
})

// initialize the SDK and register with the OpenTelemetry API
// this enables the API to record telemetry
sdk.start()

// gracefully shut down the SDK on process exit
process.on('SIGTERM', () => {
  sdk
    .shutdown()
    .then(() => console.log('Tracing terminated'))
    .catch((error) => console.log('Error terminating tracing', error))
    .finally(() => process.exit(0))
})
```

Step 3.  Run the application 
```
node -r ./tracing.js app.js
```

Step 4.  You can validate if your application is sending traces to SigNoz cloud  here . 

In case you encounter an issue where all applications do not get listed in the services section then please refer to the  troubleshooting section . 

#send-traces-to-self-hosted-signoz Send Traces to Self-Hosted SigNoz------------------------------------------------------------------------ 

Requirements 

- Node.js version 14 or newer (See here )
You can use  OpenTelemetry Nodejs  client libraries to send your traces directly to SigNoz. You have two choices for instrumenting your Nodejs application with OpenTelemetry. 

- 
Use the all-in-one auto-instrumentation library(Recommended) 

The auto-instrumentation library of OpenTelemetry is a meta package that provides a simple way to initialize multiple Nodejs instrumnetations. 

\u2705 Info 

If you are on K8s, you should checkout  opentelemetry operators  which enable auto instrumenting Javascript applications very easily. 

- 
Use a specific auto-instrumentation library 

You can use individual auto-instrumentation libraries too for a specific component of your application. For example, you can use  `@opentelemetry/instrumentation-express` for instrumenting the Express web framework.
--------------------------------------------------------------------------------
Chunk 7:
### #using-the-all-in-one-auto-instrumentation-library Using the all-in-one auto-instrumentation library

The recommended way to instrument your Javascript Nodejs application is to use the all-in-one auto-instrumentation library -  `@opentelemetry/auto-instrumentations-node`. It provides a simple way to initialize multiple Nodejs instrumentations. 

Internally, it calls the specific auto-instrumentation library for components used in the application. You can see the complete list  here . 

The instrumentation automatically identifies the following within your application: 

- Frameworks, such as Express, Nestjs
- Common protocols such as HTTP, HTTPS, and gRPC
- Databases, such as MySQL, MongoDB, Redis, etc.
- Other libraries used in the application
All in one OpenTelemetry nodejs instrumentation  

_ 

All in one auto instrumentation library - identifies and instruments packages used by your Nodejs application 

_
--------------------------------------------------------------------------------
Chunk 8:
#### #steps-to-auto-instrument-nodejs-application Steps to auto-instrument Nodejs application

- 
Install the dependencies 

We start by installing the relevant dependencies. 
```
npm install --save @opentelemetry/sdk-node
npm install --save @opentelemetry/auto-instrumentations-node
npm install --save @opentelemetry/exporter-trace-otlp-http
```

The dependencies included are briefly explained below: 

`@opentelemetry/sdk-node` - This package provides the full OpenTelemetry SDK for Node.js including tracing and metrics. 

`@opentelemetry/auto-instrumentations-node` - This module provides a simple way to initialize multiple Node instrumentations. 

`@opentelemetry/exporter-trace-otlp-http` - This module provides the exporter to be used with OTLP ( `http/json`) compatible receivers. 

\ud83d\udcdd Note 

If you run into any error, you might want to use these pinned versions of OpenTelemetry libraries used in this  GitHub repo  . 

- 
Create a  `tracing.js` file 

The  `tracing.js` file will contain the tracing setup code. Notice, that we have set some environment variables in the code(highlighted). You can update these variables based on your environment. 

// tracing.js  'use strict'  const process = require('process')  const opentelemetry = require('@opentelemetry/sdk-node')  const { getNodeAutoInstrumentations } = require('@opentelemetry/auto-instrumentations-node')  const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-http')  const { Resource } = require('@opentelemetry/resources')  const { SemanticResourceAttributes } = require('@opentelemetry/semantic-conventions') 

const exporterOptions = {  // highlight-next-line  url: 'http://localhost:4318/v1/traces',  } 

const traceExporter = new OTLPTraceExporter(exporterOptions)  const sdk = new opentelemetry.NodeSDK({  traceExporter,  instrumentations:  [ getNodeAutoInstrumentations() ] ,  // highlight-start  resource: new Resource({  [ SemanticResourceAttributes.SERVICE_NAME ] : 'node_app',  }),  // highlight-end  }) 

// initialize the SDK and register with the OpenTelemetry API  // this enables the API to record telemetry  sdk.start() 

// gracefully shut down the SDK on process exit  process.on('SIGTERM', () => {  sdk  .shutdown()  .then(() => console.log('Tracing terminated'))  .catch((error) => console.log('Error terminating tracing', error))  .finally(() => process.exit(0))  }) 

OpenTelemetry Node SDK currently does not detect the  `OTEL_RESOURCE_ATTRIBUTES` from  `.env` files as of today. That\u2019s why we need to include the variables in the  `tracing.js` file itself. 

About environment variables: 

`service_name`\u00a0: node \ _ app (you can give whatever name that suits you) 

`http://localhost:4318/v1/traces` is the default url for sending your tracing data. We are assuming you have installed SigNoz on your  `localhost`. Based on your environment, you can update it accordingly. It should be in the following format: 
```
http://<IP of SigNoz backend>:4318/v1/traces
```

\ud83d\udcdd Note 

Remember to allow incoming requests to port 4318 of machine where SigNoz backend is hosted. 

- 
Run the application 

The tracing configuration should be run before your application code. We will use the  `-r, \u2014require module` flag for that. 
```
node -r ./tracing.js app.js
```

\ud83d\udcdd Note 

If you're running your nodejs application in PM2 cluster mode, it doesn't support node args:  Unitech/pm2#3227  . As above sample app instrumentation requires to load  `tracing.js` before app load by passing node arg, so nodejs instrumentation doesn't work in PM2 cluster mode. So you need to import  `tracing.js` in your main application. The  `import ./tracing.js` should be the first line of your application code and initialize it before any other function. Here's the  sample github repo  which shows the implementation. 

In case you encounter an issue where all applications do not get listed in the services section then please refer to the  troubleshooting section  . 

#validating-instrumentation-by-checking-for-traces Validating instrumentation by checking for traces--------------------------------------------------------------------------------------------------------
--------------------------------------------------------------------------------
Chunk 9:
With your application running, you can verify that you\u2019ve instrumented your application with OpenTelemetry correctly by confirming that tracing data is being reported to SigNoz.

To do this, you need to ensure that your application generates some data. Applications will not produce traces unless they are being interacted with, and OpenTelemetry will often buffer data before sending. So you need to interact with your application and wait for some time to see your tracing data in SigNoz. 

Validate your traces in SigNoz: 

- Trigger an action in your app that generates a web request. Hit the endpoint a number of times to generate some data. Then, wait for some time.
- In SigNoz, open the `Services` tab. Hit the `Refresh` button on the top right corner, and your application should appear in the list of `Applications`.
- Go to the `Traces` tab, and apply relevant filters to see your application\u2019s traces.
You might see other dummy applications if you\u2019re using SigNoz for the first time. You can remove it by following the docs  here . 

Node Application in the list of services being monitored in SigNoz 

Node Application in the list of services being monitored in SigNoz 

If you don't see your application reported in the list of services, try our  troubleshooting  guide.
--------------------------------------------------------------------------------
Chunk 10:
### #using-a-specific-auto-instrumentation-library Using a specific auto-instrumentation library

If total installation size is not constrained, it is recommended to use the\u00a0 `@opentelemetry/auto-instrumentations-node` bundle with  `@opentelemetry/sdk-node` for the most seamless instrumentation experience. 

But you can also install specific auto-instrumenation packages for the components used by your application. 

All in one OpenTelemetry nodejs instrumentation  

_ 

You can also choose individual auto-instrumenation libraries, but the all-in-one library is recommended to get started 

_ 

If an application uses Express, HTTP, and MongoDB, we can instrument the application using the following modules: 

- opentelemetry-instrumentation-express
- opentelemetry/instrumentation-mongodb
- opentelemetry/instrumentation-http
If you are using Express, the instrumentation relies on HTTP calls to also be instrumented. That\u2019s why we\u2019re also including the module for http instrumentation. Let\u2019s see the steps required. 

Steps to use specific auto-instrumentation libraries 

- 
Install the dependencies 

We start by installing the relevant dependencies. 
```
npm install --save @opentelemetry/sdk-node
npm install --save @opentelemetry/exporter-trace-otlp-http
npm install --save @opentelemetry/instrumentation-express
npm install --save @opentelemetry/instrumentation-mongodb
npm install --save @opentelemetry/instrumentation-http
```

- 
Creat a  `tracing.js` file 

The  `tracing.js` file will contain the following tracing setup code. 
```
// tracing.js
'use strict'
const process = require('process')
//OpenTelemetry
const opentelemetry = require('@opentelemetry/sdk-node')
const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-http')
//instrumentations
const { ExpressInstrumentation } = require('@opentelemetry/instrumentation-express')
const { MongoDBInstrumentation } = require('@opentelemetry/instrumentation-mongodb')
const { HttpInstrumentation } = require('@opentelemetry/instrumentation-http')

const { Resource } = require('@opentelemetry/resources')
const { SemanticResourceAttributes } = require('@opentelemetry/semantic-conventions')

const exporterOptions = {
  url: 'http://localhost:4318/v1/traces',
}

const traceExporter = new OTLPTraceExporter(exporterOptions)
const sdk = new opentelemetry.NodeSDK({
  traceExporter,
  instrumentations: [\\
    new ExpressInstrumentation(),\\
    new MongoDBInstrumentation(),\\
    new HttpInstrumentation(),\\
  ],
  resource: new Resource({
    [SemanticResourceAttributes.SERVICE_NAME]: 'node_app',
  }),
})

// initialize the SDK and register with the OpenTelemetry API
// this enables the API to record telemetry
sdk.start()

// gracefully shut down the SDK on process exit
process.on('SIGTERM', () => {
  sdk
    .shutdown()
    .then(() => console.log('Tracing terminated'))
    .catch((error) => console.log('Error terminating tracing', error))
    .finally(() => process.exit(0))
})
```

OpenTelemetry Node SDK currently does not detect the  `OTEL_RESOURCE_ATTRIBUTES` from  `.env` files as of today. That\u2019s why we need to include the variables in the  `tracing.js` file itself. 

About environment variables: 

`service_name`\u00a0: node \ _ app (you can give whatever name that suits you) 

`http://localhost:4318/v1/traces` is the default url for sending your tracing data. We are assuming you have installed SigNoz on your  `localhost`. Based on your environment, you can update it accordingly. It should be in the following format: 

`http://<IP of SigNoz backend>:4318/v1/traces`

\ud83d\udcdd Note 

Remember to allow incoming requests to port 4318 of machine where SigNoz backend is hosted. 

- 
Run the application 

The tracing configuration should be run before your application code. We will use the  `-r, \u2014require module` flag for that. 
```
node -r ./tracing.js app.js
```

\ud83d\udcdd Note 

If you're running your nodejs application in PM2 cluster mode, it doesn't support node args:  Unitech/pm2#3227  . As above sample app instrumentation requires to load  `tracing.js` before app load by passing node arg, so nodejs instrumentation doesn't work in PM2 cluster mode. So you need to import  `tracing.js` in your main application. The  `import ./tracing.js` should be the first line of your application code and initialize it before any other function. Here's the  sample github repo  which shows the implementation.
--------------------------------------------------------------------------------
Chunk 11:
With your application running, you can verify that you\u2019ve instrumented your application with OpenTelemetry correctly by validating  if your traces are being to SigNoz. 

#manual-instrumentation-in-javascript Manual Instrumentation in JavaScript------------------------------------------------------------------------------ 

For those looking to gain deeper insights into their application's performance and behavior, manual instrumentation provides a powerful way to achieve this. 

Refer to the documentation for  Manual Instrumentation in NodeJS  to delve into the step-by-step process of adding custom tracing to your Node.js applications. 

#instrumentation-modules-for-databases Instrumentation Modules for Databases-------------------------------------------------------------------------------- 

The  `@opentelemetry/auto-instrumentations-node` can inititialize instrumentation for popular databases. Hence it\u2019s recommended to  get started  with it. 

But if you are using  specific auto-instrumentation packages  , here\u2019s a list of packages for popular databases.
--------------------------------------------------------------------------------
Chunk 12:
### #mongodb-instrumentation MongoDB instrumentation

\ud83d\udcdd Note 

If you\u2019re using  `@opentelemetry/auto-instrumentations-node`, you don\u2019t need to install specific modules for your database. 

Supported Versions 

\u2022  `>=3.3 <5`

Module that provides automatic instrumentation for MongoDB: 
```
npm install --save @opentelemetry/instrumentation-mongodb
```
--------------------------------------------------------------------------------
Chunk 13:
### #redis-instrumentation Redis Instrumentation

\ud83d\udcdd Note 

If you\u2019re using  `@opentelemetry/auto-instrumentations-node`, you don\u2019t need to install specific modules for your database. 

Supported Versions 

This package supports\u00a0 `redis@^2.6.0` and\u00a0 `redis@^3.0.0` For version\u00a0 `redis@^4.0.0`, please use\u00a0 `@opentelemetry/instrumentation-redis-4`
```
npm install --save @opentelemetry/instrumentation-redis
```
--------------------------------------------------------------------------------
Chunk 14:
### #mysql-instrumentation MySQL Instrumentation

\ud83d\udcdd Note 

If you\u2019re using  `@opentelemetry/auto-instrumentations-node`, you don\u2019t need to install specific modules for your database. 

Supported Versions 

\u2022  `2.x`

Module that provides automatic instrumentation for MySQL: 
```
npm install --save @opentelemetry/instrumentation-mysql
```
--------------------------------------------------------------------------------
Chunk 15:
### #memcached-instrumentation Memcached Instrumentation

\ud83d\udcdd Note 

If you\u2019re using  `@opentelemetry/auto-instrumentations-node`, you don\u2019t need to install specific modules for your database. 

Supported Versions 

- `>=2.2`
Module that provides automatic instrumentation for Memcached: 
```
npm install --save @opentelemetry/instrumentation-memcached
```

#troubleshooting-your-installation Troubleshooting your installation------------------------------------------------------------------------ 

Set an environment variable to run the OpenTelemetry launcher in debug mode, where it logs details about the configuration and emitted spans: 
```
export OTEL_LOG_LEVEL=debug
```

The output may be very verbose with some benign errors. Early in the console output, look for logs about the configuration. Next, look for lines like the ones below, which are emitted when spans are emitted to SigNoz. 
```
{
  \"traceId\": \"985b66d592a1299f7d12ebca56ca1fe3\",
  \"parentId\": \"8d62a70aa335a227\",
  \"name\": \"bar\",
  \"id\": \"17ada85c3d55376a\",
  \"kind\": 0,
  \"timestamp\": 1685674607399000,
  \"duration\": 299,
  \"attributes\": {},
  \"status\": { \"code\": 0 },
  \"events\": []
}
{
  \"traceId\": \"985b66d592a1299f7d12ebca56ca1fe3\",
  \"name\": \"foo\",
  \"id\": \"8d62a70aa335a227\",
  \"kind\": 0,
  \"timestamp\": 1585130342183948,
  \"duration\": 315,
  \"attributes\": {
    \"name\": \"value\"
  },
  \"status\": { \"code\": 0 },
  \"events\": [\\
    {\\
      \"name\": \"event in foo\",\\
      \"time\": [1585130342, 184213041]\\
    }\\
  ]
}
```

Running short applications (Lambda/Serverless/etc)  If your application exits quickly after startup, you may need to explicitly shutdown the tracer to ensure that all spans are flushed: 
```
opentelemetry.trace.getTracer('your_tracer_name').getActiveSpanProcessor().shutdown()
```

#sample-javascript-app Sample Javascript App------------------------------------------------ 

- We have included a sample applications at:
  - 
Sample React App Github Repo 

  - 
Sample NodeJs App Github Repo 

  - 
Sample Distributed Tracing NodeJs App Github Repo 

#further-reading Further Reading------------------------------------ 

- 
Nodejs Performance Monitoring 

- 
Implementing Distributed Tracing in a Nodejs application
--------------------------------------------------------------------------------
Chunk 16:
### #frequently-asked-questions Frequently Asked Questions

- 
How to find what to use in  `IP of SigNoz` if I have installed SigNoz in Kubernetes cluster? 

Based on where you have installed your application and where you have installed SigNoz, you need to find the right value for this. Please use  this grid  to find the value you should use for  `IP of SigNoz`

- 
I am sending data from my application to SigNoz, but I don't see any events or graphs in the SigNoz dashboard. What should I do? 

This could be because of one of the following reasons: 

  - 
Your application is generating telemetry data, but not able to connect with SigNoz installation 

Please use this  troubleshooting guide  to find if your application is able to access SigNoz installation and send data to it. 

  - 
Your application is not actually generating telemetry data 

Please check if the application is generating telemetry data first. You can use  `Console Exporter` to just print your telemetry data in console first. Join our  Slack Community  if you need help on how to export your telemetry data in console 

  - 
Your SigNoz installation is not running or behind a firewall 

Please double check if the pods in SigNoz installation are running fine.  `docker ps` or  `kubectl get pods -n platform` are your friends for this. 

#what-cloud-endpoint-should-i-use What Cloud Endpoint Should I Use?----------------------------------------------------------------------- 

The primary method for sending data to SigNoz Cloud is through OTLP exporters. You can either send the data directly from your application using the exporters available in SDKs/language agents or send the data to a collector agent, which batches/enriches telemetry and sends it to the Cloud.
--------------------------------------------------------------------------------
Chunk 17:
### #my-collector-sends-data-to-signoz-cloud My Collector Sends Data to SigNoz Cloud

#### #using-grpc-exporter Using gRPC Exporter

The endpoint should be  `ingest.{region}.signoz.cloud:443`, where  `{region}` should be replaced with  `in`,  `us`, or  `eu`. Note that the exporter endpoint doesn't require a scheme for the gRPC exporter in the collector. 
```
# Sample config with `us` region
exporters:
    otlp:
        endpoint: \"ingest.us.signoz.cloud:443\"
        tls:
            insecure: false
        headers:
            \"signoz-access-token\": \"<SIGNOZ_INGESTION_KEY>\"
```
--------------------------------------------------------------------------------
Chunk 18:
#### #using-http-exporter Using HTTP Exporter

The endpoint should be  `https://ingest.{region}.signoz.cloud:443`, where  `{region}` should be replaced with  `in`,  `us`, or  `eu`. Note that the endpoint includes the scheme  `https` for the HTTP exporter in the collector. 
```
# Sample config with `us` region
exporters:
    otlphttp:
        endpoint: \"https://ingest.us.signoz.cloud:443\"
        tls:
            insecure: false
        headers:
            \"signoz-access-token\": \"<SIGNOZ_INGESTION_KEY>\"
```
--------------------------------------------------------------------------------
Chunk 19:
### #my-application-sends-data-to-signoz-cloud My Application Sends Data to SigNoz Cloud

The endpoint should be configured either with environment variables or in the SDK setup code.
--------------------------------------------------------------------------------
Chunk 20:
#### #using-environment-variables Using Environment Variables

##### #using-grpc-exporter-1 Using gRPC Exporter

Examples with  `us` region 

- `OTEL_EXPORTER_OTLP_PROTOCOL=grpc OTEL_EXPORTER_OTLP_ENDPOINT=https://ingest.us.signoz.cloud:443 OTEL_EXPORTER_OTLP_HEADERS=signoz-access-token=<SIGNOZ_INGESTION_KEY>`
--------------------------------------------------------------------------------
Chunk 21:
##### #using-http-exporter-1 Using HTTP Exporter

- `OTEL_EXPORTER_OTLP_PROTOCOL=http/protobuf OTEL_EXPORTER_OTLP_ENDPOINT=https://ingest.us.signoz.cloud:443 OTEL_EXPORTER_OTLP_HEADERS=signoz-access-token=<SIGNOZ_INGESTION_KEY>`
--------------------------------------------------------------------------------
Chunk 22:
#### #configuring-endpoint-in-code Configuring Endpoint in Code

Please refer to the agent documentation.
--------------------------------------------------------------------------------
Chunk 23:
### #sending-data-from-a-third-party-service Sending Data from a Third-Party Service

The endpoint configuration here depends on the export protocol supported by the third-party service. They may support either gRPC, HTTP, or both. Generally, you will need to adjust the host and port. The host address should be  `ingest.{region}.signoz.cloud:443`, where  `{region}` should be replaced with  `in`,  `us`, or  `eu`, and port  `443` should be used. 

- Prev: JBoss
- Next: ExpressOn this page
Send traces to SigNoz Cloud 

No Code Automatic Instrumentation (recommended) 

Code Level Automatic Instrumentation 

Send Traces to Self-Hosted SigNoz 

Using the all-in-one auto-instrumentation library 

Validating instrumentation by checking for traces 

Using a specific auto-instrumentation library 

Manual Instrumentation in JavaScript 

Instrumentation Modules for Databases 

MongoDB instrumentation 

Redis Instrumentation 

MySQL Instrumentation 

Memcached Instrumentation 

Troubleshooting your installation 

Sample Javascript App 

Further Reading 

Docs 

Introduction  Contributing 

Knowledge Base 

SigNoz API 

Community 

Support 

Slack 

Twitter 

Community Archive 

Changelog 

More 

SigNoz vs Datadog  SigNoz vs New Relic  SigNoz vs Grafana  SigNoz vs Dynatrace 

Careers 

About  Terms  Privacy  Security & Compliance 



SigNoz 

All systems operational 

    

",
--------------------------------------------------------------------------------
