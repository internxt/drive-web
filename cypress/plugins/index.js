/// <reference types="cypress" />
// ***********************************************************
// This example plugins/index.js can be used to load plugins
//
// You can change the location of this file or turn off loading
// the plugins file with the 'pluginsFile' configuration option.
//
// You can read more here:
// https://on.cypress.io/plugins-guide
// ***********************************************************

// This function is called when a project is opened or re-opened (e.g. due to
// the project's config changing)

import crypto from 'crypto';

/**
 * @type {Cypress.PluginConfig}
 */
// eslint-disable-next-line no-unused-vars
module.exports = (on, config) => {
  // `on` is used to hook into various events Cypress emits
  // `config` is the resolved Cypress config

  // Gen random throwaway user
  config.env = {};
  config.env.inxtUser = `${crypto.randomBytes(8).toString('hex')}@inxt.com`;
  // Password requires at least an uppercase, a lowercase and a number
  config.env.inxtPassword = `Pw4${crypto.randomBytes(4).toString('hex')}`;

  return config;
};
