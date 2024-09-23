class CloudWatchLogGroupClassPlugin {
  constructor(serverless, options) {
    this.serverless = serverless;
    this.options = options;
    this.provider = this.serverless.getProvider("aws");
    this.hooks = {
      "package:compileFunctions": this.beforeDeploy.bind(this),
    };

    // Extend validation schema, note that this is not
    // reliable as configValidationMode may not be set to 'error'
    serverless.configSchemaHandler.defineCustomProperties({
      type: "object",
      properties: {
        infrequentAccessLogs: { type: "boolean" },
      },
    });

    serverless.configSchemaHandler.defineFunctionProperties("aws", {
      properties: {
        infrequentAccessLogs: { type: "boolean" },
      },
    });

    serverless.configSchemaHandler.defineCustomProperties({
      type: "object",
      properties: {
        infrequentAccessLogRetention: { type: "number" },
      },
    });

    serverless.configSchemaHandler.defineFunctionProperties("aws", {
      properties: {
        infrequentAccessLogRetention: { type: "number" },
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

  sanitiseLogRetentionParam(input) {
    // Valid values obtained from CloudFormation documentation
    const validRetentionInDays = [
      1, 3, 5, 7, 14, 30, 60, 90, 120, 150, 180, 365, 400, 545, 731, 1096, 1827,
      2192, 2557, 2922, 3288, 3653,
    ];

    if (typeof input === "number" && validRetentionInDays.includes(input)) {
      return input;
    } else {
      throw new Error(
        `infrequentAccessLogRetention must be one of ${validRetentionInDays}`
      );
    }
  }

  configureLogGroup(globalInfrequentAccess, globalLogRetention) {
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

      const localLogRetention =
        service.functions[lambda].infrequentAccessLogRetention;

      // Local value overrides global value if defined
      const isInfrequentAccess = localInfrequentAccess !== undefined
        ? this.sanitiseBooleanParam(localInfrequentAccess)
        : globalInfrequentAccess;

      const logRetention = localLogRetention
        ? this.sanitiseLogRetentionParam(localLogRetention)
        : globalLogRetention;

      const lambdaLogicalId = `${this.provider.naming.getNormalizedFunctionName(lambda)}LambdaFunction`;
      const lambdaObject =
        service.provider.compiledCloudFormationTemplate.Resources[lambdaLogicalId];

      const iaLogGroupLogicalId = `${lambda}PluginIALogGroup`;
      const iaLogGroupName = `/aws/lambda/plugin/ia/${service.functions[lambda].name}`;

      // Add infrequent access log group
      const infrequentAccessLogGroup = {
        Type: "AWS::Logs::LogGroup",
        Properties: {
          LogGroupName: iaLogGroupName,
          LogGroupClass: "INFREQUENT_ACCESS",
          ...(logRetention && { RetentionInDays: logRetention }),
        },
      };

      // Add IA log group to service resources
      // even if it may be unused to prevent deletion
      resources.Resources[iaLogGroupLogicalId] = infrequentAccessLogGroup;

      // Add role permissions to push logs to the IA log group
      const lambdaRoleLogicalId = lambdaObject.Properties.Role["Fn::GetAtt"][0];
      const lambdaRoleObject = service.provider.compiledCloudFormationTemplate.Resources[lambdaRoleLogicalId];
      lambdaRoleObject.Policies.push(
        {
          PolicyName: `${service.functions[lambda].name}-ia-log-group-policy`,
          PolicyDocument: {
            Version: "2024-09-23",
            Statement: [
              {
                "Effect": "Allow",
                "Action": [
                  "logs:CreateLogStream",
                  "logs:PutLogEvents"
                ],
                "Resource": [
                  {
                    "Fn::Join": [
                      ":",
                      [
                        "arn",
                        { Ref: "AWS::Partition" },
                        "logs",
                        { Ref: "AWS::Region" },
                        { Ref: "AWS::AcccountId" },
                        `log-group:${iaLogGroupName}:*`
                      ]
                    ]
                  }
                ]
              }
            ]
          }
        }
      );

      if (isInfrequentAccess) {
        // Associate the lambda with the IA log group
        lambdaObject.DependsOn = [iaLogGroupLogicalId].concat(
          lambdaObject.DependsOn || []
        );
        lambdaObject.Properties.LoggingConfig = {
          LogGroup: iaLogGroupName,
        };
      }
    });
  }

  beforeDeploy() {
    const service = this.serverless.service;

    // Get global value if defined, otherwise default to false
    const globalInfrequentAccess =
      service.custom && service.custom.infrequentAccessLogs !== undefined
        ? this.sanitiseBooleanParam(service.custom.infrequentAccessLogs)
        : false;

    // Get global value if defined, otherwise default to null (never expires)
    const globalLogRetention =
      service.custom && service.custom.infrequentAccessLogRetention
        ? this.sanitiseLogRetentionParam(
            service.custom.infrequentAccessLogRetention
          )
        : null;

    this.configureLogGroup(globalInfrequentAccess, globalLogRetention);
  }
}

module.exports = CloudWatchLogGroupClassPlugin;
