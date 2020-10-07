import { readFileSync } from 'fs';
import { join } from 'path';
import { SOURCE_MAPPING_PREFIX } from 'ts-jest/dist/compiler/instance';

import { NgJestCompiler } from '../compiler/ng-jest-compiler';
import { NgJestConfig } from '../config/ng-jest-config';

// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
const jestCfgStub = {
  testMatch: ['**/__tests__/**/*.[jt]s?(x)', '**/?(*.)+(spec|test).[jt]s?(x)'],
  testRegex: ['(/__tests__/.*|(\\\\.|/)(test|spec))\\\\.[jt]sx?$'],
  globals: {
    'ts-jest': {
      diagnostics: {
        pretty: false,
      },
    },
  },
} as any; // eslint-disable-line @typescript-eslint/no-explicit-any

function executeHoistingTest(ngJestConfig: NgJestConfig) {
  // Verify if we use `ts-jest` hoisting transformer
  test('should hoist correctly', () => {
    const fileName = join(__dirname, '__mocks__', 'foo.spec.ts');
    ngJestConfig.parsedTsConfig = {
      ...ngJestConfig.parsedTsConfig,
      rootNames: [fileName],
    };
    const compiler = new NgJestCompiler(ngJestConfig);

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const emittedResult = compiler.getCompiledOutput(fileName, readFileSync(fileName, 'utf-8'))!;

    // Source map is different based on file location which can fail on CI, so we only compare snapshot for js
    expect(emittedResult.substring(0, emittedResult.indexOf(SOURCE_MAPPING_PREFIX))).toMatchSnapshot();
  });
}

describe('NgJestCompiler', () => {
  describe('with isolatedModules true', () => {
    const ngJestConfig = new NgJestConfig({
      ...jestCfgStub,
      globals: {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        'ts-jest': {
          ...jestCfgStub.globals['ts-jest'],
          isolatedModules: true,
        },
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    });

    // Isolated modules true doesn't have downlevel ctor so this snapshot test should produce different input than with Program
    test('should return result', () => {
      const fileName = join(__dirname, '__mocks__', 'foo.service.ts');
      const compiler = new NgJestCompiler(ngJestConfig);

      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const emittedResult = compiler.getCompiledOutput(fileName, readFileSync(fileName, 'utf-8'))!;

      // Source map is different based on file location which can fail on CI, so we only compare snapshot for js
      expect(emittedResult.substring(0, emittedResult.indexOf(SOURCE_MAPPING_PREFIX))).toMatchSnapshot();
    });

    executeHoistingTest(ngJestConfig);
  });

  describe('with isolatedModule false', () => {
    const ngJestConfig = new NgJestConfig(jestCfgStub);

    test('should return compiled result for new file which is not known by Program', () => {
      const fileName = join(__dirname, '__mocks__', 'app.component.ts');
      ngJestConfig.parsedTsConfig = {
        ...ngJestConfig.parsedTsConfig,
        rootNames: [],
      };
      const compiler = new NgJestCompiler(ngJestConfig);

      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const emittedResult = compiler.getCompiledOutput(fileName, readFileSync(fileName, 'utf-8'))!;

      // Source map is different based on file location which can fail on CI, so we only compare snapshot for js
      expect(emittedResult.substring(0, emittedResult.indexOf(SOURCE_MAPPING_PREFIX))).toMatchSnapshot();
    });

    test('should return compiled result for existing file which is known by Program', () => {
      const fileName = join(__dirname, '__mocks__', 'app.component.ts');
      ngJestConfig.parsedTsConfig = {
        ...ngJestConfig.parsedTsConfig,
        rootNames: [fileName],
      };
      const compiler = new NgJestCompiler(ngJestConfig);

      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const emittedResult = compiler.getCompiledOutput(fileName, readFileSync(fileName, 'utf-8'))!;

      // Source map is different based on file location which can fail on CI, so we only compare snapshot for js
      expect(emittedResult.substring(0, emittedResult.indexOf(SOURCE_MAPPING_PREFIX))).toMatchSnapshot();
    });

    test('should throw diagnostics error for new file which is not known by Program', () => {
      const fileName = join(__dirname, '__mocks__', 'foo.component.ts');
      ngJestConfig.parsedTsConfig = {
        ...ngJestConfig.parsedTsConfig,
        rootNames: [],
      };
      const compiler = new NgJestCompiler(ngJestConfig);

      expect(() =>
        compiler.getCompiledOutput('foo.ts', readFileSync(fileName, 'utf-8')),
      ).toThrowErrorMatchingSnapshot();
    });

    test('should throw diagnostics error for existing file which is known by Program', () => {
      const fileName = join(__dirname, '__mocks__', 'foo.component.ts');
      ngJestConfig.parsedTsConfig = {
        ...ngJestConfig.parsedTsConfig,
        rootNames: [fileName],
      };
      const compiler = new NgJestCompiler(ngJestConfig);

      expect(() =>
        compiler.getCompiledOutput(fileName, readFileSync(fileName, 'utf-8')),
      ).toThrowErrorMatchingSnapshot();
    });

    test('should not throw diagnostics error when shouldReportDiagnostics return false', () => {
      const fileName = join(__dirname, '__mocks__', 'foo.component.ts');
      ngJestConfig.parsedTsConfig = {
        ...ngJestConfig.parsedTsConfig,
        rootNames: [fileName],
      };
      ngJestConfig.shouldReportDiagnostics = jest.fn().mockReturnValueOnce(false);
      const compiler = new NgJestCompiler(ngJestConfig);

      expect(() => compiler.getCompiledOutput(fileName, readFileSync(fileName, 'utf-8'))).not.toThrowError();
    });

    executeHoistingTest(ngJestConfig);

    /**
     * This test is copied from https://github.com/angular/angular/blob/master/packages/compiler-cli/test/transformers/downlevel_decorators_transform_spec.ts
     * Only one test is enough to verify that our NgJestCompiler does use Angular downlevel ctor transformer.
     */
    test('should downlevel decorators for @Injectable decorated class', () => {
      const fileName = join(__dirname, '__mocks__', 'foo.service.ts');
      ngJestConfig.parsedTsConfig = {
        ...ngJestConfig.parsedTsConfig,
        rootNames: [fileName],
      };
      const compiler = new NgJestCompiler(ngJestConfig);
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const emittedResult = compiler.getCompiledOutput(fileName, readFileSync(fileName, 'utf-8'))!;

      // Source map is different based on file location which can fail on CI, so we only compare snapshot for js
      expect(emittedResult.substring(0, emittedResult.indexOf(SOURCE_MAPPING_PREFIX))).toMatchSnapshot();
    });
  });
});
