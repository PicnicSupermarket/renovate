import { envMock, exec, mockExecSequence } from '../../../test/exec-util';
import { env, getName } from '../../../test/util';
import _fs from 'fs-extra';
import dataFiles from '../../data-files.generated';
import {
  extractPackageFile,
  getPythonAlias,
  parsePythonVersion,
  pythonVersions,
  resetModule,
} from './extract';

const fs: jest.Mocked<typeof _fs> = _fs as any;

jest.mock('child_process');
jest.mock('fs-extra');
jest.mock('../../util/exec/env');

describe(getName(__filename), () => {
  beforeEach(() => {
    jest.resetAllMocks();
    jest.resetModules();
    resetModule();

    env.getChildProcessEnv.mockReturnValue(envMock.basic);
  });
  describe('parsePythonVersion', () => {
    it('returns major and minor version numbers', () => {
      expect(parsePythonVersion('Python 2.7.15rc1')).toEqual([2, 7]);
    });
  });
  describe('getPythonAlias', () => {
    it('returns the python alias to use', async () => {
      const execSnapshots = mockExecSequence(exec, [
        { stdout: '', stderr: 'Python 2.7.17\\n' },
        new Error(),
        { stdout: 'Python 3.8.0\\n', stderr: '' },
      ]);
      const result = await getPythonAlias();
      expect(pythonVersions).toContain(result);
      expect(result).toMatchSnapshot();
      expect(await getPythonAlias()).toEqual(result);
      expect(execSnapshots).toMatchSnapshot();
      expect(execSnapshots).toHaveLength(3);
    });
  });
  describe('extractPackageFile', () => {
    it('can parse a setup.py importing stuff from its own package', async () => {
      fs.outputFile.mockResolvedValueOnce(null as never);
      fs.readFile.mockResolvedValueOnce(dataFiles.get('extract.py') as any);
      const pkgInfo = await extractPackageFile(
        '',
        'lib/manager/pip_setup/__fixtures__/setup-3.py',
        {}
      );
      expect(pkgInfo.packageFileVersion).toEqual('1.0');
    }, 15000);
  });
});
