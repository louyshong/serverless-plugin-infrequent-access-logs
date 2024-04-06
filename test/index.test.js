const { createECDH } = require("crypto");
const CloudWatchLogGroupClassPlugin = require("../index");

function mockGetNormalizedFunctionName(funcName) {
  return funcName;
}

function createTestInstance(config) {
  const resources = {};

  Object.keys(config.functions).forEach((func) => {
    resources[`${mockGetNormalizedFunctionName(func)}LambdaFunction`] = {
      DependsOn: [`${mockGetNormalizedFunctionName(func)}LogGroup`],
      Properties: {}
    };
    resources[`${mockGetNormalizedFunctionName(func)}LogGroup`] = {};
  });

  return {
    testInstance: new CloudWatchLogGroupClassPlugin(
      {
        service: {
          resources: {},
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

// describe("IA log retention set globally", () => {
//   test("Local value overrides global value");

//   test("Local value undefined");

//   test("Throw error on invalid retention value");
// });

// describe("IA log retention undefined globally", () => {
//   test("Local value defined");

//   test("Local value undefined");
// });
