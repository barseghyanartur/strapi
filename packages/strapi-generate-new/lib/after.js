'use strict';

/**
 * Module dependencies
 */

// Node.js core.
const path = require('path');

// Public node modules.
const _ = require('lodash');
const fs = require('fs-extra');
const npm = require('npm');

// Logger.
const logger = require('strapi-utils').logger;

/**
 * Runs after this generator has finished
 *
 * @param {Object} scope
 * @param {Function} cb
 */

module.exports = (scope, cb) => {
  const packageJSON = require(path.resolve(scope.rootPath, 'package.json'));
  const strapiRootPath = path.resolve(scope.strapiRoot, '..');

  process.chdir(scope.rootPath);

  // Copy the default files.
  fs.copySync(path.resolve(__dirname, '..', 'files'), path.resolve(scope.rootPath));

  const missingDependencies = [];

  // Verify if the dependencies are available into the global
  _.forEach(_.merge(_.get(packageJSON, 'dependencies'), _.get(packageJSON, 'devDependencies')), (value, key) => {
    try {
      fs.accessSync(path.resolve(strapiRootPath, key), fs.constants.R_OK | fs.constants.W_OK);
      fs.symlinkSync(path.resolve(strapiRootPath, key), path.resolve(scope.rootPath, 'node_modules', key), 'dir');
    } catch (e1) {
      try {
        fs.accessSync(path.resolve(scope.strapiRoot, 'node_modules', key), fs.constants.R_OK | fs.constants.W_OK);
        fs.symlinkSync(path.resolve(scope.strapiRoot, 'node_modules', key), path.resolve(scope.rootPath, 'node_modules', key), 'dir');
      } catch (e2) {
        missingDependencies.push(key);
      }
    }
  });

  logger.info('Your new application `' + scope.name + '` is ready at `' + scope.rootPath + '`.');

  if (!_.isEmpty(missingDependencies)) {
    npm.load({loglevel: 'silent'}, function(err) {
      if (err) {
        console.log();
        logger.warn('You should run `npm install` into your application before starting it.');
        console.log();
        logger.warn('Some dependencies could not be installed:');
        _.forEach(missingDependencies, value => logger.warn('• ' + value));
        console.log();

        return cb();
      }

      const installDependency = (dependency, index) => {
        if (_.isEmpty(dependency)) {
          console.log();
          return cb();
        }

        console.log();
        logger.info('Installing ' + dependency + '...');
        console.log();

        npm.commands.install([dependency], (err) => {
          if (err) {
            console.log();
            logger.warn('You should run `npm install ' + dependency + '` into your application before starting it.');
            console.log();
          }

          installDependency(missingDependencies[index++], index);
        });
      };

      installDependency(missingDependencies[0], 0);
    });
  }
};
