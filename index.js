class CloudWatchLogGroupClassPlugin {
  constructor(serverless, options) {
    this.serverless = serverless;
    this.options = options;
    this.provider = this.serverless.getProvider("aws");
    this.hooks = {
      "package:compileFunctions": this.beforeDeploy.bind(this),
    };
  }

  isBoolean(input) {
    if (typeof input === "boolean") {
      return true;
    }
    return false;
  }

  configureLogGroup(globalInfrequentAccess) {
    const service = this.serverless.service;

    if (!service.functions) {
      return;
    }

    // Get resources specified in service file
    service.resources = service.resources ?? {};
    const resources = service.resources;
    resources.Resources = resources.Resources ?? {};

    Object.keys(service.functions).forEach((lambda) => {
      const localInfrequentAccess =
        service.functions[lambda].infrequentAccessLogs;

      if (
        !this.isBoolean(localInfrequentAccess) &&
        !this.isBoolean(globalInfrequentAccess)
      ) {
        // Either global or local value must be valid
        throw new Error("infrequentAccessLogs must be either true or false");
      }

      // Local value overrides global value
      const isInfrequentAccess =
        localInfrequentAccess ?? globalInfrequentAccess;

      service.custom && service.custom.infrequentAccessLogs
        ? this.isBoolean(service.custom.infrequentAccessLogs)
        : null;

      const lambdaLogicalId =
        service.provider.compiledCloudFormationTemplate.Resources[
          `${this.provider.naming.getNormalizedFunctionName(
            lambda
          )}LambdaFunction`
        ];

      const iaLogGroupLogicalId = `${lambda}PluginIALogGroup`;

      // Add infrequent access log group
      const infrequentAccessLogGroup = {
        Type: "AWS::Logs::LogGroup",
        Properties: {
          LogGroupName: `/aws/lambda/plugin/ia/${lambda}`,
          LogGroupClass: "INFREQUENT_ACCESS",
        },
      };
  
      // Add IA log group to service resources
      // even if it may be unused to prevent deletion
      resources.Resources[iaLogGroupLogicalId] = infrequentAccessLogGroup;

      if (isInfrequentAccess) {
        // Associate the lambda with the IA log group
        lambdaLogicalId.DependsOn = [iaLogGroupLogicalId].concat(
          lambdaLogicalId.DependsOn || []
        );
        lambdaLogicalId.Properties.LoggingConfig = {
          LogGroup: iaLogGroupLogicalId,
        };
      }
    });
  }

  beforeDeploy() {
    const service = this.serverless.service;
    // Get global value if it exists
    const globalInfrequentAccess =
      service.custom && service.custom.infrequentAccessLogs;

    this.configureLogGroup(globalInfrequentAccess);
  }
}

module.exports = CloudWatchLogGroupClassPlugin;
