import * as datasourceGradleVersion from '../../datasource/gradle-version';
import { logger } from '../../logger';
import * as gradleVersioning from '../../versioning/gradle';
import { PackageDependency, PackageFile } from '../common';

const DISTRIBUTION_URL_REGEX = /^(?<assignment>distributionUrl\s*=\s*)\S*-(?<version>(\d|\.)+)-(?<type>bin|all)\.zip\s*$/;

export function extractPackageFile(fileContent: string): PackageFile | null {
  logger.debug('gradle-wrapper.extractPackageFile()');
  const lines = fileContent.split('\n');

  for (const line of lines) {
    const distributionUrlMatch = DISTRIBUTION_URL_REGEX.exec(line);
    if (distributionUrlMatch) {
      const dependency: PackageDependency = {
        depName: 'gradle',
        currentValue: distributionUrlMatch.groups.version,
        datasource: datasourceGradleVersion.id,
        versioning: gradleVersioning.id,
      };
      logger.debug(dependency, 'Gradle Wrapper');
      return { deps: [dependency] };
    }
  }
  return null;
}
