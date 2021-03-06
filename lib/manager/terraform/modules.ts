import * as datasourceGitTags from '../../datasource/git-tags';
import * as datasourceGithubTags from '../../datasource/github-tags';
import * as datasourceTerraformModule from '../../datasource/terraform-module';
import { logger } from '../../logger';
import { SkipReason } from '../../types';
import { PackageDependency } from '../common';
import { extractTerraformProvider } from './providers';
import { ExtractionResult, TerraformDependencyTypes } from './util';

const githubRefMatchRegex = /github.com([/:])(?<project>[^/]+\/[a-z0-9-.]+).*\?ref=(?<tag>.*)$/;
const gitTagsRefMatchRegex = /(?:git::)?(?<url>(?:http|https|ssh):\/\/(?:.*@)?(?<path>.*.*\/(?<project>.*\/.*)))\?ref=(?<tag>.*)$/;
const hostnameMatchRegex = /^(?<hostname>([\w|\d]+\.)+[\w|\d]+)/;

export function extractTerraformModule(
  startingLine: number,
  lines: string[],
  moduleName: string
): ExtractionResult {
  const result = extractTerraformProvider(startingLine, lines, moduleName);
  result.dependencies.forEach((dep) => {
    // eslint-disable-next-line no-param-reassign
    dep.managerData.terraformDependencyType = TerraformDependencyTypes.module;
  });
  return result;
}

export function analyseTerraformModule(dep: PackageDependency): void {
  const githubRefMatch = githubRefMatchRegex.exec(dep.managerData.source);
  const gitTagsRefMatch = gitTagsRefMatchRegex.exec(dep.managerData.source);
  /* eslint-disable no-param-reassign */
  if (githubRefMatch) {
    const depNameShort = githubRefMatch.groups.project.replace(/\.git$/, '');
    dep.depType = 'github';
    dep.depName = 'github.com/' + depNameShort;
    dep.depNameShort = depNameShort;
    dep.currentValue = githubRefMatch.groups.tag;
    dep.datasource = datasourceGithubTags.id;
    dep.lookupName = depNameShort;
  } else if (gitTagsRefMatch) {
    dep.depType = 'gitTags';
    if (gitTagsRefMatch.groups.path.includes('//')) {
      logger.debug('Terraform module contains subdirectory');
      dep.depName = gitTagsRefMatch.groups.path.split('//')[0];
      dep.depNameShort = dep.depName.split(/\/(.+)/)[1];
      const tempLookupName = gitTagsRefMatch.groups.url.split('//');
      dep.lookupName = tempLookupName[0] + '//' + tempLookupName[1];
    } else {
      dep.depName = gitTagsRefMatch.groups.path.replace('.git', '');
      dep.depNameShort = gitTagsRefMatch.groups.project.replace('.git', '');
      dep.lookupName = gitTagsRefMatch.groups.url;
    }
    dep.currentValue = gitTagsRefMatch.groups.tag;
    dep.datasource = datasourceGitTags.id;
  } else if (dep.managerData.source) {
    const moduleParts = dep.managerData.source.split('//')[0].split('/');
    if (moduleParts[0] === '..') {
      dep.skipReason = SkipReason.Local;
    } else if (moduleParts.length >= 3) {
      const hostnameMatch = hostnameMatchRegex.exec(dep.managerData.source);
      if (hostnameMatch) {
        dep.registryUrls = [`https://${hostnameMatch.groups.hostname}`];
      }
      dep.depType = 'terraform';
      dep.depName = moduleParts.join('/');
      dep.depNameShort = dep.depName;
      dep.datasource = datasourceTerraformModule.id;
    }
  } else {
    logger.debug({ dep }, 'terraform dep has no source');
    dep.skipReason = SkipReason.NoSource;
  }
  /* eslint-enable no-param-reassign */
}
