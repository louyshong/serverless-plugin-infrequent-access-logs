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
      return input;
    } else {
      throw new Error("infrequentAccessLogs must be either true or false");
    }
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

      if (!localInfrequentAccess && !globalInfrequentAccess) {
        // Either global or local value must exist
        return;
      }

      // Add infrequent access log group
      const infrequentAccessLogGroup = {
        Type: "AWS::Logs::LogGroup",
        Properties: {
          LogGroupName: `/aws/lambda/plugin/ia/${lambda}`,
          LogGroupClass: "INFREQUENT_ACCESS",
        },
      };

      // Decide log group class
      const isInfrequentAccess = localInfrequentAccess
        ? this.isBoolean(localInfrequentAccess)
        : globalInfrequentAccess;

      const lambdaLogicalId =
        service.provider.compiledCloudFormationTemplate.Resources[
          `${this.provider.naming.getNormalizedFunctionName(lambda)}LambdaFunction`
        ];

      const iaLogGroupLogicalId = `${lambda}PluginIALogGroup`;

      if (isInfrequentAccess) {
        // Add IA log group to service resources
        resources.Resources[iaLogGroupLogicalId] = infrequentAccessLogGroup;
        // Associate the lambda with the IA log group
        lambdaLogicalId.DependsOn = [iaLogGroupLogicalId].concat(
          lambdaLogicalId.DependsOn || []
        );
        lambdaLogicalId.Properties.LoggingConfig = {
          LogGroup: iaLogGroupLogicalId
        };
      }
    });
  }

  beforeDeploy() {
    const service = this.serverless.service;
    // Get global value if it exists
    const globalInfrequentAccess =
      service.custom && service.custom.infrequentAccessLogs
        ? this.isBoolean(service.custom.infrequentAccessLogs)
        : null;

    this.configureLogGroup(globalInfrequentAccess);
  }
}

module.exports = CloudWatchLogGroupClassPlugin;
