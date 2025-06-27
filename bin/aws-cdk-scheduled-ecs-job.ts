#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { AwsCdkScheduledEcsJobStack } from '../lib/aws-cdk-scheduled-ecs-job-stack';
import { PipelineStack } from '../lib/pipeline';

const app = new cdk.App();

// Get the environment name.
const envName: string = app.node.tryGetContext('ENV_NAME') || 'dev';

// Retrieve global and environment configurations to create a context.
const envConfig = app.node.tryGetContext(envName);
const globalConfig = app.node.tryGetContext('globals');
const context: CDKContext = { ...globalConfig, ...envConfig };

const jobStack = new AwsCdkScheduledEcsJobStack(app, 'AwsCdkScheduledEcsJobStack', {
  /* If you don't specify 'env', this stack will be environment-agnostic.
   * Account/Region-dependent features and context lookups will not work,
   * but a single synthesized template can be deployed anywhere. */

  /* Uncomment the next line to specialize this stack for the AWS Account
   * and Region that are implied by the current CLI configuration. */
  env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION },

  /* Uncomment the next line if you know exactly what Account and Region you
   * want to deploy the stack to. */
  // env: { account: '123456789012', region: 'us-east-1' },

  /* For more information, see https://docs.aws.amazon.com/cdk/latest/guide/environments.html */
});

const pipelineStack = new PipelineStack(app, 'AwsCdkScheduledEcsJobPipelinestack', {
  env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION },
  context: context,
  ecr: jobStack.ecr
});

/**
 * This is a custom class type we use to pull in our global and environment
 * specific configurations. There are never any credentials or secrets stored 
 * here but it may contain dbnames, usernames, github repo urls, etc.
 * 
 * The information resides in the cdk.json file near the bottom. Again, this 
 * is not for credentials, just descriptions and configurations of your stack(s).
 */
export type CDKContext = {
  appName: string;
  serviceName: string;
  region: string;
  environment: string;
  isProd: boolean;
  clusterArn: string;
  domain: string;
  subdomain: string,
  baseDir: string;
  codeStarConnectionArn: string;
  repo: {
    owner: string,
    name: string,
    branch: string
  },
  database: {
    dbName: string;
    dbAdmin: string;
  };
}