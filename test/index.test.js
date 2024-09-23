const CloudWatchLogGroupClassPlugin = require("../index");

function mockGetNormalizedFunctionName(funcName) {
  return funcName;
}

function createTestInstance(config) {
  const resources = {};
  const serviceResources = {};

  Object.keys(config.functions).forEach((func) => {
    resources[`${mockGetNormalizedFunctionName(func)}LambdaFunction`] = {
      DependsOn: [`${mockGetNormalizedFunctionName(func)}LogGroup`],
      Properties: {
        Role: {
          "Fn::GetAtt": [
            "MockIamRole"
          ]
        }
      }
    };
    resources[`${mockGetNormalizedFunctionName(func)}LogGroup`] = {};
  });

  resources["MockIamRole"] = {
    Policies: {
      PolicyDocument: {
        Statement: []
      }
    }
  };

  return {
    testInstance: new CloudWatchLogGroupClassPlugin(
      {
        service: {
          resources: serviceResources,
          functions: config.functions,
          custom: config.custom,
          provider: {
            compiledCloudFormationTemplate: {
              Resources: resources,
            },
          },
        },
        getProvider: jest.fn(() => {
          return {
            naming: {
              getNormalizedFunctionName: mockGetNormalizedFunctionName,
            },
          };
        }),
        configSchemaHandler: {
          defineCustomProperties: jest.fn(),
          defineFunctionProperties: jest.fn(),
        },
      },
      {}
    ),
    resources: resources,
    serviceResources: serviceResources
  };
}

describe("Infrequent access set globally", () => {
  const custom = {
    infrequentAccessLogs: true,
  };

  test("Local value overrides global value", () => {
    const { testInstance, resources } = createTestInstance({
      functions: {
        func1: {
          infrequentAccessLogs: false,
        },
      },
      custom: custom,
    });

    testInstance.beforeDeploy();

    expect(
      resources[`${mockGetNormalizedFunctionName("func1")}LambdaFunction`]
        .Properties.LoggingConfig
    ).toBeUndefined();
  });

  test("Local value undefined", () => {
    const { testInstance, resources } = createTestInstance({
      functions: {
        func1: {},
      },
      custom: custom,
    });

    testInstance.beforeDeploy();

    expect(
      resources[`${mockGetNormalizedFunctionName("func1")}LambdaFunction`]
        .Properties.LoggingConfig
    ).toBeDefined();
  });

  test("Throw error on non-boolean value", () => {
    const { testInstance, resources } = createTestInstance({
      functions: {
        func1: {
          infrequentAccessLogs: "false",
        },
      },
      custom: custom,
    });

    expect(() => {
      testInstance.beforeDeploy()
    }).toThrow();
  })
});

describe("Infrequent access undefined globally", () => {
  const custom = {};

  test("Local value defined", () => {
    const { testInstance, resources } = createTestInstance({
      functions: {
        func1: {
          infrequentAccessLogs: true,
        },
      },
      custom: custom,
    });

    testInstance.beforeDeploy();

    expect(
      resources[`${mockGetNormalizedFunctionName("func1")}LambdaFunction`]
        .Properties.LoggingConfig
    ).toBeDefined();
  });

  test("Local value undefined", () => {
    const { testInstance, resources } = createTestInstance({
      functions: {
        func1: {},
      },
      custom: custom,
    });

    testInstance.beforeDeploy();

    expect(
      resources[`${mockGetNormalizedFunctionName("func1")}LambdaFunction`]
        .Properties.LoggingConfig
    ).toBeUndefined();
  });
});

describe("IA log retention set globally", () => {
  const custom = {
    infrequentAccessLogs: true,
    infrequentAccessLogRetention: 30
  };

  test("Local value overrides global value", () => {
    const { testInstance, serviceResources } = createTestInstance({
      functions: {
        func1: {
          infrequentAccessLogRetention: 7,
        },
      },
      custom: custom,
    });

    testInstance.beforeDeploy();

    expect(
      serviceResources.Resources["func1PluginIALogGroup"]
        .Properties.RetentionInDays
    ).toEqual(7);
  });

  test("Local value undefined", () => {
    const { testInstance, serviceResources } = createTestInstance({
      functions: {
        func1: {}
      },
      custom: custom,
    });

    testInstance.beforeDeploy();

    expect(
      serviceResources.Resources["func1PluginIALogGroup"]
        .Properties.RetentionInDays
    ).toEqual(30);
  });

  test("Throw error on invalid retention value", () => {
    const { testInstance } = createTestInstance({
      functions: {
        func1: {
          infrequentAccessLogRetention: 4
        }
      },
      custom: custom,
    });

    expect(() => {testInstance.beforeDeploy()}).toThrow();
  });
});

describe("IA log retention undefined globally", () => {
  const custom = {
    infrequentAccessLogs: true
  };

  test("Local value defined", () => {
    const { testInstance, serviceResources } = createTestInstance({
      functions: {
        func1: {
          infrequentAccessLogRetention: 7,
        },
      },
      custom: custom,
    });

    testInstance.beforeDeploy();

    expect(
      serviceResources.Resources["func1PluginIALogGroup"]
        .Properties.RetentionInDays
    ).toEqual(7);
  });

  test("Local value undefined", () => {
    const { testInstance, serviceResources } = createTestInstance({
      functions: {
        func1: {},
      },
      custom: custom,
    });

    testInstance.beforeDeploy();

    expect(
      serviceResources.Resources["func1PluginIALogGroup"]
        .Properties.RetentionInDays
    ).toBeUndefined();
  });
});
