# serverless-plugin-infrequent-access-logs

This plugin allows you to create and configure infrequent access log groups for your lambdas. 

As CloudFormation [does not support changing log group classes](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-logs-loggroup.html), this plugin will instead add new infrequent access log groups to your CloudFormation stack following the pattern: 
- `/aws/lambda/ia/${lambda}`

Notes: 
- Any existing log groups managed by Serverless will remain in your CloudFormation stack.
- When removing this plugin, any log groups created by this plugin will also be deleted from your CloudFormation stack.
- When setting `infrequentAccessLogs: false`, any IA log groups created by this plugin will remain.

## Usage
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