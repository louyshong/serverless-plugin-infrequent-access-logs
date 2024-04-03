class CloudWatchLogGroupClassPlugin {
  constructor(serverless, options) {
    this.serverless = serverless;
    this.options = options;
    this.provider = this.serverless.getProvider("aws");
    this.hooks = {
      "package:compileFunctions": this.beforeDeploy.bind(this),
    };

    // Extend validation schema, note that this is not
    // reliable as configValidationMode may not be set to 'error'.
    // It is mostly here to remove the warning in the console.
    serverless.configSchemaHandler.defineCustomProperties({
      type: 'object',
      properties: {
        infrequentAccessLogs: { type: 'boolean' },
      },
    });

    serverless.configSchemaHandler.defineFunctionProperties("aws", {
      properties: {
        infrequentAccessLogs: { type: "boolean" },
      },
    });
  }

  sanitiseBooleanParam(input) {
    if (typeof input === "boolean") {
      return input;
    } else {
      throw new Error(
        "infrequentAccessLogs must be either boolean true or false"
      );
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

      // Local value overrides global value if defined
      const isInfrequentAccess = localInfrequentAccess
        ? this.sanitiseBooleanParam(localInfrequentAccess)
        : globalInfrequentAccess;

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

    // Get global value if defined, otherwise default to false
    const globalInfrequentAccess =
      service.custom && service.custom.infrequentAccessLogs
        ? this.sanitiseBooleanParam(service.custom.infrequentAccessLogs)
        : false;

    this.configureLogGroup(globalInfrequentAccess);
  }
}

module.exports = CloudWatchLogGroupClassPlugin;
