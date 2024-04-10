# serverless-plugin-infrequent-access-logs
[![serverless](http://public.serverless.com/badges/v3.svg)](http://www.serverless.com)
[![tests](https://github.com/louyshong/serverless-plugin-infrequent-access-logs/actions/workflows/run-tests.yml/badge.svg)](https://github.com/louyshong/serverless-plugin-infrequent-access-logs/actions/workflows/run-tests.yml)
[![codecov](https://codecov.io/gh/louyshong/serverless-plugin-infrequent-access-logs/graph/badge.svg?token=89NHFISJAU)](https://codecov.io/gh/louyshong/serverless-plugin-infrequent-access-logs)

This plugin allows you to create and configure infrequent access log groups for your lambdas. 

As CloudFormation [does not support changing log group classes](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-logs-loggroup.html), this plugin will instead add new infrequent access log groups to your CloudFormation stack following the pattern: 
- `/aws/lambda/plugin/ia/${lambda}`

## Usage
1. Install the plugin.
```
npm install serverless-plugin-infrequent-access-logs
```
2. Register it in your `serverless.yml` file.
```
service: sample

plugins:
  - serverless-plugin-infrequent-access-logs

provider:
  name: aws

custom:
  infrequentAccessLogs: true # Set globally for all lambdas
  infrequentAccessLogRetention: 30

functions:
  function1:
  function2:
    infrequentAccessLogs: true # Set for specific lambdas (will override the global value)
    infrequentAccessLogRetention: 7
```

## Notes
- Adding this plugin into your `serverless.yml` file will automatically result in IA log groups being created for all your lambdas, even if you do not set `infrequentAccessLogs: true`.
- Setting `infrequentAccessLogs: true` to a lambda simply configures the lambda to use the IA log group.
- When setting `infrequentAccessLogs: false`, the IA log groups created by this plugin will remain but will not be used by your lambdas.
- Any existing log groups managed by Serverless will remain in your CloudFormation stack.
- When removing this plugin, any IA log groups created by this plugin will also be deleted from your CloudFormation stack.
- Valid log retention values can be found [here](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-logs-loggroup.html).
- `infrequentAccessLogRetention` works independently from `infrequentAccessLogs` in the sense that you can specify/update either one without the other.
- If no values are set, the default configuration is false and the default log retention is forever.
