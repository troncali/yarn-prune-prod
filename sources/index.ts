import {BaseCommand} from '@yarnpkg/cli';
import {Cache, Configuration, Plugin, Project, StreamReport} from '@yarnpkg/core';

class PruneProd extends BaseCommand {
  static paths = [
    ["prune-prod"],
  ];

  async execute() {
    const configuration = await Configuration.find(this.context.cwd, this.context.plugins);
    const {project} = await Project.find(configuration, this.context.cwd);
    const cache = await Cache.find(configuration);

    await project.restoreInstallState({
      restoreResolutions: false,
    });

    for (const workspace of project.workspaces) {
      workspace.manifest.devDependencies.clear();
    }

    const report = await StreamReport.start({
      configuration,
      json: false,
      stdout: this.context.stdout,
      includeLogs: true,
    }, async (report: StreamReport) => {
      await project.install({cache, report, persistProject: false});
      await project.cacheCleanup({cache, report});
    });

    return report.exitCode();
  }
}

const plugin: Plugin = {
  commands: [
    PruneProd,
  ],
};

export default plugin;
