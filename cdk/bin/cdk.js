#!/usr/bin/env node

const cdk = require('aws-cdk-lib');
const { ExpressFargateDemo } = require('../lib/cdk-stack');

const config = {
  FRONTEND_PORT: 3000,
  AWS_REGION: 'eu-central-1', //region where your applicaiton is deployed
  GITHUB_REPO_CONFIG: {
    owner: 'Four-Nine-Digital',
    repo: 'express-fargate-demo',
    branch: 'main',
    oauthToken: cdk.SecretValue.secretsManager('prashant/github/token', { //secret name
      jsonField: 'prashant-github-token', // value you entered for the key
    }),
  },
}
const app = new cdk.App();
new ExpressFargateDemo(app, 'ExpressFargateDemo', {
  env: {
    region: config.AWS_REGION,
  },
  environmentVariables: config
});
